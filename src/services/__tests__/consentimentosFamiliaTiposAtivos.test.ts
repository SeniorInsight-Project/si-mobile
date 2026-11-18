import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { consentimentosDosTiposAtivos } from '../mappers/consentimentos';
import { statusDoContrato } from '../mappers/telemetria';
import { mensagemParaFamilia, statusMonitoramento } from '../consentimentoService';

const IDOSO = 'e3b0c442-98fc-1c14-9afc-432100000001';
const status = (tiposAtivos: any) =>
  statusDoContrato({ idosoId: IDOSO, ultimaSincronizacao: null, tiposAtivos } as any);

describe('Home do cuidador: autorizações do idoso vêm de /status → tiposAtivos (auditoria 2, item 2)', () => {
  test('tiposAtivos do contrato viram as autorizações por tipo', () => {
    const c = consentimentosDosTiposAtivos(status(['PASSOS', 'BATIMENTOS']).sensores);
    assert.deepEqual(c, { BATIMENTOS: true, PASSOS: true, SONO: false, OXIGENACAO: false, LOCALIZACAO: false });
    assert.equal(statusMonitoramento(c), 'PARCIAL');
    assert.equal(mensagemParaFamilia(c), 'Semáforo calculado sem dados de sono, oxigenação');
  });

  test('lista vazia ou ausente: monitoramento pausado, nada autorizado', () => {
    for (const tipos of [[], null, undefined]) {
      const c = consentimentosDosTiposAtivos(status(tipos).sensores);
      assert.equal(statusMonitoramento(c), 'PAUSADO');
      assert.equal(c.LOCALIZACAO, false);
    }
  });

  test('a Home não chama mais /consentimentos', () => {
    const fonte = readFileSync('src/screens/HomeScreen.tsx', 'utf8');
    assert.ok(!fonte.includes('obterConsentimentos'));
  });
});
