import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
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

    test('carregarStatusRelogioIdoso deve funcionar sem internet a partir do cache local', async () => {
      const vinteMinAtras = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      await salvarSyncRelogioLocal(IDOSO_ID, vinteMinAtras);

      const status = await carregarStatusRelogioIdoso(IDOSO_ID);
      assert.equal(status.funcionando, true);
      assert.equal(status.titulo, 'Relógio funcionando');
    });
  });
});
