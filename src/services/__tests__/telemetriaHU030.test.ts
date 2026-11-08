import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  carregarBiometriaIdoso,
} from '../elderlyTelemetryService';
import {
  salvarTelemetriaLocal,
  obterTelemetriaLocal,
  limparTelemetriaLocal,
} from '../telemetryDatabase';

describe('HU-030: Passos e Batimentos na Tela do Idoso (Issue #55)', () => {
  const IDOSO_ID = 'idoso-teste-hu030';

  beforeEach(async () => {
    await limparTelemetriaLocal();
  });

  describe('Cenário 1: Dados biométricos e persistência offline', () => {
    it('deve persistir e recuperar passos e batimentos no SQLite local', async () => {
      await salvarTelemetriaLocal(IDOSO_ID, {
        passosHoje: 2340,
        frequenciaCardiaca: 72,
        coletadoEm: '2026-11-07T10:00:00Z',
      });

      const doCache = await obterTelemetriaLocal(IDOSO_ID);
      assert.ok(doCache, 'Deve recuperar do cache');
      assert.strictEqual(doCache.passosHoje, 2340);
      assert.strictEqual(doCache.frequenciaCardiaca, 72);
    });

    it('carregarBiometriaIdoso deve retornar números para exibição em números grandes', async () => {
      await salvarTelemetriaLocal(IDOSO_ID, {
        passosHoje: 4520,
        frequenciaCardiaca: 68,
      });

      const res = await carregarBiometriaIdoso(IDOSO_ID);
      assert.strictEqual(res.passosHoje, 4520);
      assert.strictEqual(res.frequenciaCardiaca, 68);
    });
  });

  describe('Cenário 2: Esconder cartão de tipo não autorizado', () => {
    it('quando idoso não é informado, deve desautorizar e não exibir cartões', async () => {
      const res = await carregarBiometriaIdoso(null);
      assert.strictEqual(res.passosAutorizados, false);
      assert.strictEqual(res.batimentosAutorizados, false);
    });

    it('deve manter propriedades booleanas passosAutorizados e batimentosAutorizados para controle de visibilidade', async () => {
      const res = await carregarBiometriaIdoso(IDOSO_ID);
      assert.strictEqual(typeof res.passosAutorizados, 'boolean');
      assert.strictEqual(typeof res.batimentosAutorizados, 'boolean');
    });
  });
});
