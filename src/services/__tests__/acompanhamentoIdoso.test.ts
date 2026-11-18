import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  listarUltimosSos,
  resumoRelogioParaFamilia,
  sosEmAberto,
  telefoneDoIdoso,
} from '../acompanhamentoIdosoService';
import { SosError } from '../sosRecebidoService';
import { ApiError } from '../apiClient';
import { ABAS_POR_PAPEL, podeAcessar } from '../acessoService';

const IDOSO = 'e3b0c442-98fc-1c14-9afc-432100000001';
const alarme = (id: string, criadoEm: string, status = 'RESOLVIDO') => ({ id, idosoId: IDOSO, criadoEm, status, nomeIdoso: 'João' });

describe('Acompanhamento do idoso pelo familiar (só leitura)', () => {
  test('últimos SOS vêm de GET /idosos/{id}/sos, do mais recente, limitados', async () => {
    const caminhos: string[] = [];
    const cliente = {
      get: (async (c: string) => {
        caminhos.push(c);
        return [alarme('a', '2026-11-01T10:00:00Z'), alarme('c', '2026-11-03T10:00:00Z', 'DISPARADO'), alarme('b', '2026-11-02T10:00:00Z')];
      }) as any,
      put: (async () => ({})) as any,
    };
    const lista = await listarUltimosSos(IDOSO, { cliente, limite: 2 });
    assert.deepEqual(caminhos, [`/api/v1/idosos/${IDOSO}/sos`]);
    assert.deepEqual(lista.map((a) => a.id), ['c', 'b']);
    assert.equal(sosEmAberto(lista[0]), true);
    assert.equal(sosEmAberto(lista[1]), false);
  });

  test('erro na lista de SOS vira SosError', async () => {
    const cliente = { get: (async () => { throw new ApiError(503, null, '/x'); }) as any, put: (async () => ({})) as any };
    await assert.rejects(listarUltimosSos(IDOSO, { cliente }), (e: unknown) => e instanceof SosError);
  });

  test('status do relógio fala com o familiar', () => {
    assert.equal(resumoRelogioParaFamilia({ funcionando: true, minutosDesdeSincronizacao: 5 }, 'João').titulo, 'Relógio enviando dados');
    assert.match(resumoRelogioParaFamilia({ funcionando: false, minutosDesdeSincronizacao: 180 }, 'João').subtitulo, /3 h.*João/);
    assert.match(resumoRelogioParaFamilia({ funcionando: false, minutosDesdeSincronizacao: Infinity }, 'João').subtitulo, /Nenhum envio/);
  });

  test('telefone do idoso só com dígitos suficientes', () => {
    assert.equal(telefoneDoIdoso('(61) 98123-4567'), '61981234567');
    assert.equal(telefoneDoIdoso(''), null);
    assert.equal(telefoneDoIdoso(null), null);
  });

  test('familiar não abre o Modo Idoso: a aba dele é o acompanhamento', () => {
    assert.equal(podeAcessar('FAMILIAR', 'ElderlyMode'), false);
    assert.equal(podeAcessar('FAMILIAR', 'ElderlyMonitor'), true);
    assert.equal(podeAcessar('IDOSO', 'ElderlyMonitor'), false);
    const ids = ABAS_POR_PAPEL.FAMILIAR.map((a) => a.id);
    assert.ok(!ids.includes('ElderlyMode'));
    assert.ok(ids.includes('ElderlyMonitor'));
  });

  test('a tela de acompanhamento não dispara SOS', async () => {
    const { readFileSync } = await import('node:fs');
    const fonte = readFileSync('src/screens/ElderlyMonitorScreen.tsx', 'utf8');
    assert.equal(/dispararSos|SosHoldButton|enfileirarSos|iniciarCicloEnvio|SosActiveModal/.test(fonte), false);
  });
});
