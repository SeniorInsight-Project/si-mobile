import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dispararSos, atualizarStatusAlarme, obterAlarme, obterAlarmeAtivo } from '../alarmeSosService';
import { ApiError } from '../apiClient';

const IDOSO = 'e3b0c442-98fc-1c14-9afc-432100000001';
const ALARME = '33333333-3333-4333-8333-333333333333';
const criadoEm = new Date().toISOString();
const alarmeApi = (p: Record<string, unknown> = {}) => ({ id: ALARME, idosoId: IDOSO, nomeIdoso: 'Maria', status: 'DISPARADO', criadoEm, ...p });

function cliente(rotas: Record<string, unknown> = {}) {
  const chamadas: Array<{ metodo: string; caminho: string; corpo?: any; opcoes?: any }> = [];
  const executa = (metodo: string) => async (caminho: string, a?: any, b?: any) => {
    const opcoes = metodo === 'GET' ? a : b;
    chamadas.push({ metodo, caminho, corpo: metodo === 'GET' ? undefined : a, opcoes });
    const r = rotas[`${metodo} ${caminho}`];
    if (r instanceof Error) throw r;
    if (r === undefined) throw new ApiError(404, null, caminho);
    return r;
  };
  return { chamadas, get: executa('GET') as any, post: executa('POST') as any, put: executa('PUT') as any };
}

describe('SOS do idoso pelo apiClient, contrato care-v1 (HU35)', () => {
  test('dispararSos: POST no path do contrato com Idempotency-Key e só os campos de DispararSosRequest', async () => {
    const c = cliente({ [`POST /api/v1/idosos/${IDOSO}/sos`]: alarmeApi() });
    const r = await dispararSos(IDOSO, { latitude: -23.5, longitude: -46.6, nivelBateria: 80, observacao: 'Socorro', idempotencyKey: 'chave-1' }, { cliente: c });
    assert.equal(c.chamadas[0].opcoes.headers['Idempotency-Key'], 'chave-1');
    assert.deepEqual(c.chamadas[0].corpo, { observacao: 'Socorro', latitude: -23.5, longitude: -46.6, nivelBateria: 80 });
    assert.equal(r.id, ALARME);
  });

  test('dispararSos: sem localização nem bateria o corpo não leva esses campos, e sem chave não manda o header', async () => {
    const c = cliente({ [`POST /api/v1/idosos/${IDOSO}/sos`]: alarmeApi() });
    await dispararSos(IDOSO, { latitude: null, longitude: null, nivelBateria: null }, { cliente: c });
    assert.deepEqual(Object.keys(c.chamadas[0].corpo), ['observacao']);
    assert.equal(c.chamadas[0].opcoes.headers, undefined);
  });

  test('dispararSos: erro lança ApiError com o status (a fila offline reenvia) e não guarda alarme local', async () => {
    const c = cliente({ [`POST /api/v1/idosos/${IDOSO}/sos`]: new ApiError(0, null, '/x') });
    await assert.rejects(dispararSos(IDOSO, { idempotencyKey: 'k' }, { cliente: c }), (e: any) => e.status === 0);
  });

  test('atualizarStatusAlarme delega ao PUT /sos/{id}/status com os status do contrato', async () => {
    for (const status of ['EM_ATENDIMENTO', 'RESOLVIDO', 'CANCELADO'] as const) {
      const c = cliente({ [`PUT /api/v1/sos/${ALARME}/status`]: alarmeApi({ status }) });
      const r = await atualizarStatusAlarme(ALARME, status, 'obs', { cliente: c });
      assert.deepEqual(c.chamadas[0].corpo, { status, observacao: 'obs' });
      assert.equal(r.status, status);
    }
  });

  test('atualizarStatusAlarme: erro lança e nada é atualizado só no aparelho', async () => {
    const c = cliente({ [`PUT /api/v1/sos/${ALARME}/status`]: new ApiError(500, null, '/x') });
    await assert.rejects(atualizarStatusAlarme(ALARME, 'RESOLVIDO', '', { cliente: c }), /Não foi possível/);
  });

  test('obterAlarme e obterAlarmeAtivo delegam ao sosRecebidoService', async () => {
    const c = cliente({
      [`GET /api/v1/sos/${ALARME}`]: alarmeApi(),
      [`GET /api/v1/idosos/${IDOSO}/sos`]: [alarmeApi({ status: 'RESOLVIDO', id: 'velho' }), alarmeApi()],
    });
    assert.equal((await obterAlarme(ALARME, { cliente: c })).idosoNome, 'Maria');
    assert.equal((await obterAlarmeAtivo(IDOSO, { cliente: c }))?.id, ALARME);
    const vazio = cliente({ [`GET /api/v1/idosos/${IDOSO}/sos`]: [] });
    assert.equal(await obterAlarmeAtivo(IDOSO, { cliente: vazio }), null);
  });
});
