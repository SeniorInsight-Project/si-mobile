import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../apiClient';
import {
  avaliarStatusRelogioIdoso,
  carregarStatusRelogioIdoso,
  RelogioStatusError,
} from '../relogioStatusService';
import {
  salvarSyncRelogioLocal,
  obterSyncRelogioLocal,
  limparSyncRelogioLocal,
} from '../relogioDatabase';

describe('HU-025: Status do Relógio na Tela do Idoso (Issue #53)', () => {
  const IDOSO_ID = 'idoso-teste-relogio-hu025';
  const agora = new Date('2026-11-07T12:00:00Z');

  beforeEach(async () => {
    await limparSyncRelogioLocal();
  });

  describe('Cenário 1: Relógio funcionando (sincronização recente)', () => {
    test('deve exibir indicador verde e "Relógio funcionando" quando sincronizado há 10 min', () => {
      const dezMinAtras = new Date(agora.getTime() - 10 * 60 * 1000).toISOString();
      const status = avaliarStatusRelogioIdoso(dezMinAtras, agora);

      assert.equal(status.funcionando, true);
      assert.equal(status.titulo, 'Relógio funcionando');
      assert.equal(status.cor, '#10B981'); // Verde
      assert.equal(status.icone, 'watch');
      assert.equal(status.minutosDesdeSincronizacao, 10);
    });

    test('deve considerar funcionando com sincronização há 50 min', () => {
      const cinquentaMinAtras = new Date(agora.getTime() - 50 * 60 * 1000).toISOString();
      const status = avaliarStatusRelogioIdoso(cinquentaMinAtras, agora);

      assert.equal(status.funcionando, true);
      assert.equal(status.titulo, 'Relógio funcionando');
    });
  });

  describe('Cenário 2: Relógio parado (sem dados recentes)', () => {
    test('deve exibir indicador laranja e "Seu relógio parou de enviar dados" quando sem sincronização há 3 h', () => {
      const tresHorasAtras = new Date(agora.getTime() - 3 * 60 * 60 * 1000).toISOString();
      const status = avaliarStatusRelogioIdoso(tresHorasAtras, agora);

      assert.equal(status.funcionando, false);
      assert.equal(status.titulo, 'Seu relógio parou de enviar dados');
      assert.equal(status.cor, '#D97706'); // Laranja
      assert.equal(status.icone, 'warning');
      assert.equal(status.minutosDesdeSincronizacao, 180);
    });

    test('deve exibir indicador laranja quando timestamp for nulo ou indefinido', () => {
      const status = avaliarStatusRelogioIdoso(null, agora);

      assert.equal(status.funcionando, false);
      assert.equal(status.titulo, 'Seu relógio parou de enviar dados');
      assert.equal(status.cor, '#D97706');
    });

    test('deve exibir indicador laranja quando timestamp for data inválida', () => {
      const status = avaliarStatusRelogioIdoso('data-invalida', agora);

      assert.equal(status.funcionando, false);
      assert.equal(status.titulo, 'Seu relógio parou de enviar dados');
    });
  });

  describe('Disponibilidade Offline (RNF-006 / SQLite local)', () => {
    test('deve persistir e recuperar última sincronização do relógio no SQLite local', async () => {
      const dataIso = new Date('2026-11-07T11:45:00Z').toISOString();
      await salvarSyncRelogioLocal(IDOSO_ID, dataIso);

      const recuperado = await obterSyncRelogioLocal(IDOSO_ID);
      assert.equal(recuperado, dataIso);
    });

  });

  describe('Origem do status: GET /status da telemetria, com SQLite só como cache offline', () => {
    const dezMinAtras = new Date(agora.getTime() - 10 * 60 * 1000).toISOString();
    const quarentaMinAtras = new Date(agora.getTime() - 40 * 60 * 1000).toISOString();
    const tresHorasAtras = new Date(agora.getTime() - 180 * 60 * 1000).toISOString();

    function clienteComStatus(ultimaSincronizacao: string | null) {
      const chamadas: string[] = [];
      const cliente = {
        get: async <T>(caminho: string): Promise<T> => {
          chamadas.push(caminho);
          return { idosoId: IDOSO_ID, ultimaSincronizacao, tiposAtivos: [] } as unknown as T;
        },
      };
      return { cliente, chamadas };
    }

    const clienteSemRede = {
      get: async <T>(caminho: string): Promise<T> => {
        throw new ApiError(0, null, caminho, 'Network request failed');
      },
    };

    test('usa o status vindo da API (rota /status do idoso) e grava a sincronização no cache', async () => {
      // O cache tem um valor antigo; o que manda é o da API.
      await salvarSyncRelogioLocal(IDOSO_ID, tresHorasAtras);
      const { cliente, chamadas } = clienteComStatus(dezMinAtras);

      const status = await carregarStatusRelogioIdoso(IDOSO_ID, { cliente, dataReferencia: agora });

      assert.deepEqual(chamadas, [`/api/v1/telemetry/idosos/${IDOSO_ID}/status`]);
      assert.equal(status.funcionando, true);
      assert.equal(status.minutosDesdeSincronizacao, 10);
      assert.equal(await obterSyncRelogioLocal(IDOSO_ID), dezMinAtras);
    });

    test('usa o cache do SQLite quando a API falha', async () => {
      await salvarSyncRelogioLocal(IDOSO_ID, quarentaMinAtras);

      const status = await carregarStatusRelogioIdoso(IDOSO_ID, { cliente: clienteSemRede, dataReferencia: agora });

      assert.equal(status.funcionando, true);
      assert.equal(status.minutosDesdeSincronizacao, 40);
    });

    test('com API fora e cache antigo, o cache é avaliado como relógio parado', async () => {
      await salvarSyncRelogioLocal(IDOSO_ID, tresHorasAtras);

      const status = await carregarStatusRelogioIdoso(IDOSO_ID, { cliente: clienteSemRede, dataReferencia: agora });

      assert.equal(status.funcionando, false);
      assert.equal(status.minutosDesdeSincronizacao, 180);
    });

    test('lança RelogioStatusError quando a API falha e não há cache', async () => {
      await assert.rejects(
        carregarStatusRelogioIdoso(IDOSO_ID, { cliente: clienteSemRede, dataReferencia: agora }),
        (erro: unknown) => erro instanceof RelogioStatusError && erro.codigo === 'SEM_DADOS'
      );
    });

    test('não cai nos dados de demonstração mesmo com mock permitido (.env.test)', async () => {
      // EXPO_PUBLIC_USAR_MOCK=true em .env.test: sem cache, a falha da API continua sendo erro.
      await assert.rejects(
        carregarStatusRelogioIdoso(IDOSO_ID, { cliente: clienteSemRede, dataReferencia: agora }),
        RelogioStatusError
      );
      assert.equal(await obterSyncRelogioLocal(IDOSO_ID), null);
    });
  });
});
