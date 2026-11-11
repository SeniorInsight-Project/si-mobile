import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { listarComorbidades, adicionarComorbidades, removerComorbidade } from '../comorbidadeService';
import { ApiError } from '../apiClient';

const IDOSO = 'e3b0c442-98fc-1c14-9afc-432100000001';

/** Cliente que registra as chamadas e responde por rota: { 'GET /caminho': valor | Error }. */
function cliente(rotas: Record<string, unknown> = {}) {
  const chamadas: Array<{ metodo: string; caminho: string; corpo?: any }> = [];
  const executa = (metodo: string) => async (caminho: string, corpo?: any) => {
    chamadas.push({ metodo, caminho, corpo });
    const r = rotas[`${metodo} ${caminho}`];
    if (r instanceof Error) throw r;
    return r;
  };
  return { chamadas, get: executa('GET') as any, post: executa('POST') as any, delete: executa('DELETE') as any };
}

describe('Comorbidades pelo apiClient, contrato care-v1 (HU15)', () => {
  // cada arquivo de teste roda em um processo próprio: não precisa restaurar o ambiente
  beforeEach(() => {
    process.env.EXPO_PUBLIC_USAR_MOCK = 'true'; // mesmo com mock ligado, o erro não vira dado inventado
  });

  test('listar: resposta do contrato é devolvida como veio, no path do contrato', async () => {
    const c = cliente({ [`GET /api/v1/idosos/${IDOSO}/comorbidades`]: { idosoId: IDOSO, comorbidades: ['Hipertensão'] } });
    const r = await listarComorbidades(IDOSO, { cliente: c });
    assert.deepEqual(r.comorbidades, ['Hipertensão']);
    assert.equal(c.chamadas[0].caminho, `/api/v1/idosos/${IDOSO}/comorbidades`);
  });

  test('listar: lista vazia do servidor fica vazia', async () => {
    const c = cliente({ [`GET /api/v1/idosos/${IDOSO}/comorbidades`]: { idosoId: IDOSO, comorbidades: [] } });
    assert.deepEqual((await listarComorbidades(IDOSO, { cliente: c })).comorbidades, []);
  });

  test('listar: erro lança, sem devolver INITIAL_COMORBIDITIES (nem com mock ligado)', async () => {
    for (const erro of [new ApiError(0, null, '/x'), new ApiError(401, null, '/x'), new ApiError(404, null, '/x'), new ApiError(500, null, '/x')]) {
      const c = cliente({ [`GET /api/v1/idosos/${IDOSO}/comorbidades`]: erro });
      await assert.rejects(listarComorbidades(IDOSO, { cliente: c }), (e: any) => e === erro);
    }
  });

  test('adicionar: corpo é só ComorbidadeRequest e devolve a lista atualizada do servidor', async () => {
    const c = cliente({ [`POST /api/v1/idosos/${IDOSO}/comorbidades`]: { idosoId: IDOSO, comorbidades: ['Diabetes'] } });
    const r = await adicionarComorbidades(IDOSO, 'Diabetes', { cliente: c });
    assert.deepEqual(c.chamadas[0].corpo, { comorbidades: ['Diabetes'] });
    assert.deepEqual(r.comorbidades, ['Diabetes']);
  });

  test('adicionar: 409 (já existe) lança com o status', async () => {
    const c = cliente({ [`POST /api/v1/idosos/${IDOSO}/comorbidades`]: new ApiError(409, { message: 'Já cadastrada' }, '/x') });
    await assert.rejects(adicionarComorbidades(IDOSO, ['Diabetes'], { cliente: c }), (e: any) => e.status === 409 && e.message === 'Já cadastrada');
  });

  test('remover: nome vai codificado no path e 204 vira true', async () => {
    const c = cliente();
    assert.equal(await removerComorbidade(IDOSO, 'Doença de Alzheimer', { cliente: c }), true);
    assert.equal(c.chamadas[0].caminho, `/api/v1/idosos/${IDOSO}/comorbidades/${encodeURIComponent('Doença de Alzheimer')}`);
  });

  test('remover: erro lança', async () => {
    const erro = new ApiError(404, null, '/x');
    const c = cliente({ [`DELETE /api/v1/idosos/${IDOSO}/comorbidades/Gripe`]: erro });
    await assert.rejects(removerComorbidade(IDOSO, 'Gripe', { cliente: c }), (e: any) => e === erro);
  });
});
