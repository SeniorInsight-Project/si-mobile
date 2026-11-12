import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { buscarEstadoAtual } from '../telemetryService';
import { buscarStatusDispositivo } from '../deviceStatusService';
import { TelemetriaError } from '../telemetriaApi';
import { ApiError } from '../apiClient';
import type { EstadoAtualApi, StatusAparelhoApi } from '../../types/api';

const IDOSO = 'e3b0c442-98fc-1c14-9afc-432100000001';
const ROTA_HOJE = `/api/v1/telemetry/idosos/${IDOSO}/hoje`;
const ROTA_STATUS = `/api/v1/telemetry/idosos/${IDOSO}/status`;

interface Chamada {
  caminho: string;
  opcoes?: unknown;
}

function cliente(resposta: unknown) {
  const chamadas: Chamada[] = [];
  return {
    chamadas,
    get: (async (caminho: string, opcoes?: unknown) => {
      chamadas.push({ caminho, opcoes });
      if (resposta instanceof Error) throw resposta;
      return resposta;
    }) as never,
  };
}

const ESTADO: EstadoAtualApi = {
  idosoId: IDOSO,
  passosHoje: 1200,
  metaPassos: 3000,
  frequenciaCardiaca: 72,
  frequenciaCardiacaRepouso: 61,
  coletadoEm: '2026-11-06T14:30:00.000Z',
};

const STATUS: StatusAparelhoApi = {
  idosoId: IDOSO,
  ultimaSincronizacao: '2026-11-06T10:15:00.000Z',
  nivelBateria: 41,
  versaoApp: '2.3.1',
  modeloCelular: 'Pixel 7',
  sistemaOperacional: 'Android 15',
  tiposAtivos: ['PASSOS', 'BATIMENTOS'],
};

describe('Telemetria pelo gateway (telemetry-v1: /hoje e /status)', () => {
  // cada arquivo de teste roda em um processo próprio: não precisa restaurar o ambiente
  beforeEach(() => {
    process.env.EXPO_PUBLIC_USAR_MOCK = 'false';
  });

  describe('estado de hoje', () => {
    test('chama GET /api/v1/telemetry/idosos/{id}/hoje pelo cliente injetado', async () => {
      const c = cliente(ESTADO);
      await buscarEstadoAtual(IDOSO, { cliente: c });
      assert.deepEqual(c.chamadas.map((x) => x.caminho), [ROTA_HOJE]);
    });

    test('lê o EstadoAtual em camelCase', async () => {
      const estado = await buscarEstadoAtual(IDOSO, { cliente: cliente(ESTADO) });
      assert.equal(estado.idosoId, IDOSO);
      assert.equal(estado.passosHoje, 1200);
      assert.equal(estado.metaPassos, 3000);
      assert.equal(estado.frequenciaCardiaca, 72);
      assert.equal(estado.frequenciaCardiacaRepouso, 61);
      assert.equal(estado.coletadoEm, '2026-11-06T14:30:00.000Z');
      assert.equal(estado.progressoPassos, 0.4);
    });

    test('não lê snake_case: payload fora do contrato não preenche o modelo', async () => {
      const foraDoContrato = { idosoId: IDOSO, passos_contagem: 1200, frequencia_cardiaca_bpm: 72, coletado_em: ESTADO.coletadoEm };
      const estado = await buscarEstadoAtual(IDOSO, { cliente: cliente(foraDoContrato) });
      assert.equal(estado.passosHoje, null);
      assert.equal(estado.frequenciaCardiaca, null);
      assert.equal(estado.coletadoEm, null);
      assert.equal(estado.semDadosRecentes, true);
    });

    test('passosHoje e frequenciaCardiaca null (tipo não autorizado) continuam null, sem virar zero', async () => {
      const estado = await buscarEstadoAtual(IDOSO, {
        cliente: cliente({ ...ESTADO, passosHoje: null, frequenciaCardiaca: null }),
      });
      assert.equal(estado.passosHoje, null);
      assert.equal(estado.frequenciaCardiaca, null);
      assert.equal(estado.progressoPassos, null);
    });

    test('coletadoEm null: sem dados recentes', async () => {
      const estado = await buscarEstadoAtual(IDOSO, { cliente: cliente({ ...ESTADO, coletadoEm: null }) });
      assert.equal(estado.coletadoEm, null);
      assert.equal(estado.semDadosRecentes, true);
      assert.equal(estado.textoAtualizacao, 'Sem dados recentes');
    });

    test('campo ausente fica ausente: sem meta de 4000, sem repouso de 64, sem nome, sem status inventado', async () => {
      const { metaPassos: _m, frequenciaCardiacaRepouso: _r, ...enxuto } = ESTADO;
      const estado = await buscarEstadoAtual(IDOSO, { cliente: cliente(enxuto) });
      assert.equal(estado.metaPassos, undefined);
      assert.equal(estado.frequenciaCardiacaRepouso, undefined);
      assert.equal(estado.progressoPassos, null);
      assert.equal('nomeIdoso' in estado, false);
      assert.equal('statusCardiovascular' in estado, false);
    });

    test('erro da API vira TelemetriaError, sem mock', async () => {
      const casos: Array<[ApiError, string]> = [
        [new ApiError(500, null, ROTA_HOJE), 'FALHA'],
        [new ApiError(404, null, ROTA_HOJE), 'FALHA'],
        [new ApiError(0, null, ROTA_HOJE), 'SEM_INTERNET'],
      ];
      for (const [erro, codigo] of casos) {
        await assert.rejects(buscarEstadoAtual(IDOSO, { cliente: cliente(erro) }), (e: unknown) => {
          assert.ok(e instanceof TelemetriaError);
          assert.equal(e.codigo, codigo);
          return true;
        });
      }
    });

    test('sem idosoId lança TelemetriaError e não chama a API', async () => {
      const c = cliente(ESTADO);
      await assert.rejects(
        buscarEstadoAtual('', { cliente: c }),
        (e: unknown) => e instanceof TelemetriaError && e.codigo === 'SEM_IDOSO'
      );
      assert.equal(c.chamadas.length, 0);
    });
  });

  describe('status do aparelho', () => {
    test('chama GET /api/v1/telemetry/idosos/{id}/status pelo cliente injetado', async () => {
      const c = cliente(STATUS);
      await buscarStatusDispositivo(IDOSO, { cliente: c });
      assert.deepEqual(c.chamadas.map((x) => x.caminho), [ROTA_STATUS]);
    });

    test('lê o StatusAparelho em camelCase', async () => {
      const status = await buscarStatusDispositivo(IDOSO, { cliente: cliente(STATUS) });
      assert.equal(status.idosoId, IDOSO);
      assert.equal(status.ultimaSincronizacao, '2026-11-06T10:15:00.000Z');
      assert.equal(status.nivelBateria, 41);
      assert.equal(status.versaoApp, '2.3.1');
      assert.equal(status.modeloCelular, 'Pixel 7');
      assert.equal(status.sistemaOperacional, 'Android 15');
    });

    test('não lê snake_case do endpoint antigo', async () => {
      const antigo = { idosoId: IDOSO, tiposAtivos: [], nivel_bateria: 41, device_model: 'Pixel 7', coletado_em: STATUS.ultimaSincronizacao };
      const status = await buscarStatusDispositivo(IDOSO, { cliente: cliente(antigo) });
      assert.equal(status.nivelBateria, undefined);
      assert.equal(status.modeloCelular, undefined);
      assert.equal(status.ultimaSincronizacao, null);
    });

    test('campos ausentes ou null ficam ausentes: sem 62%, sem v1.0.4, sem Android, sem modelo genérico', async () => {
      const status = await buscarStatusDispositivo(IDOSO, {
        cliente: cliente({ idosoId: IDOSO, ultimaSincronizacao: null, nivelBateria: null, versaoApp: null, tiposAtivos: [] }),
      });
      assert.equal(status.ultimaSincronizacao, null);
      assert.equal(status.nivelBateria, undefined);
      assert.equal(status.versaoApp, undefined);
      assert.equal(status.modeloCelular, undefined);
      assert.equal(status.sistemaOperacional, undefined);
      assert.equal('conectado' in status, false);
      assert.equal('nomeIdoso' in status, false);
    });

    test('os sensores saem só de tiposAtivos', async () => {
      const status = await buscarStatusDispositivo(IDOSO, { cliente: cliente(STATUS) });
      const ativos = status.sensores.filter((s) => s.ativo).map((s) => s.tipo).sort();
      assert.deepEqual(ativos, ['BATIMENTOS', 'PASSOS']);
      const inativos = status.sensores.filter((s) => !s.ativo).map((s) => s.tipo).sort();
      assert.deepEqual(inativos, ['LOCALIZACAO', 'OXIGENACAO', 'SONO']);
    });

    test('tiposAtivos vazio: nenhum sensor ativo', async () => {
      const status = await buscarStatusDispositivo(IDOSO, { cliente: cliente({ ...STATUS, tiposAtivos: [] }) });
      assert.equal(status.sensores.length, 5);
      assert.ok(status.sensores.every((s) => s.ativo === false));
    });

    test('erro da API vira TelemetriaError, sem mock', async () => {
      const casos: Array<[ApiError, string]> = [
        [new ApiError(500, null, ROTA_STATUS), 'FALHA'],
        [new ApiError(0, null, ROTA_STATUS), 'SEM_INTERNET'],
      ];
      for (const [erro, codigo] of casos) {
        await assert.rejects(buscarStatusDispositivo(IDOSO, { cliente: cliente(erro) }), (e: unknown) => {
          assert.ok(e instanceof TelemetriaError);
          assert.equal(e.codigo, codigo);
          return true;
        });
      }
    });

    test('sem idosoId lança TelemetriaError e não chama a API', async () => {
      const c = cliente(STATUS);
      await assert.rejects(
        buscarStatusDispositivo('', { cliente: c }),
        (e: unknown) => e instanceof TelemetriaError && e.codigo === 'SEM_IDOSO'
      );
      assert.equal(c.chamadas.length, 0);
    });
  });
});
