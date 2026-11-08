import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  avaliarStatusRelogioIdoso,
  carregarStatusRelogioIdoso,
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
    it('deve exibir indicador verde e "Relógio funcionando" quando sincronizado há 10 min', () => {
      const dezMinAtras = new Date(agora.getTime() - 10 * 60 * 1000).toISOString();
      const status = avaliarStatusRelogioIdoso(dezMinAtras, agora);

      assert.strictEqual(status.funcionando, true);
      assert.strictEqual(status.titulo, 'Relógio funcionando');
      assert.strictEqual(status.cor, '#10B981'); // Verde
      assert.strictEqual(status.icone, 'watch');
      assert.strictEqual(status.minutosDesdeSincronizacao, 10);
    });

    it('deve considerar funcionando com sincronização há 50 min', () => {
      const cinquentaMinAtras = new Date(agora.getTime() - 50 * 60 * 1000).toISOString();
      const status = avaliarStatusRelogioIdoso(cinquentaMinAtras, agora);

      assert.strictEqual(status.funcionando, true);
      assert.strictEqual(status.titulo, 'Relógio funcionando');
    });
  });

  describe('Cenário 2: Relógio parado (sem dados recentes)', () => {
    it('deve exibir indicador laranja e "Seu relógio parou de enviar dados" quando sem sincronização há 3 h', () => {
      const tresHorasAtras = new Date(agora.getTime() - 3 * 60 * 60 * 1000).toISOString();
      const status = avaliarStatusRelogioIdoso(tresHorasAtras, agora);

      assert.strictEqual(status.funcionando, false);
      assert.strictEqual(status.titulo, 'Seu relógio parou de enviar dados');
      assert.strictEqual(status.cor, '#D97706'); // Laranja
      assert.strictEqual(status.icone, 'warning');
      assert.strictEqual(status.minutosDesdeSincronizacao, 180);
    });

    it('deve exibir indicador laranja quando timestamp for nulo ou indefinido', () => {
      const status = avaliarStatusRelogioIdoso(null, agora);

      assert.strictEqual(status.funcionando, false);
      assert.strictEqual(status.titulo, 'Seu relógio parou de enviar dados');
      assert.strictEqual(status.cor, '#D97706');
    });

    it('deve exibir indicador laranja quando timestamp for data inválida', () => {
      const status = avaliarStatusRelogioIdoso('data-invalida', agora);

      assert.strictEqual(status.funcionando, false);
      assert.strictEqual(status.titulo, 'Seu relógio parou de enviar dados');
    });
  });

  describe('Disponibilidade Offline (RNF-006 / SQLite local)', () => {
    it('deve persistir e recuperar última sincronização do relógio no SQLite local', async () => {
      const dataIso = new Date('2026-11-07T11:45:00Z').toISOString();
      await salvarSyncRelogioLocal(IDOSO_ID, dataIso);

      const recuperado = await obterSyncRelogioLocal(IDOSO_ID);
      assert.strictEqual(recuperado, dataIso);
    });

    it('carregarStatusRelogioIdoso deve funcionar sem internet a partir do cache local', async () => {
      const vinteMinAtras = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      await salvarSyncRelogioLocal(IDOSO_ID, vinteMinAtras);

      const status = await carregarStatusRelogioIdoso(IDOSO_ID);
      assert.strictEqual(status.funcionando, true);
      assert.strictEqual(status.titulo, 'Relógio funcionando');
    });
  });
});
