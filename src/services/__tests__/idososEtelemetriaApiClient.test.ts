import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  listarIdososDoFamiliar,
  salvarCadastroIdoso,
  atualizarDadosIdoso,
  idosoIdDoServidor,
} from '../elderlyService';
import { buscarScoreBemEstar } from '../riskScoreService';
import { ApiError } from '../apiClient';

const IDOSO = 'e3b0c442-98fc-1c14-9afc-432100000001';

function cliente(rotas: Record<string, unknown> = {}) {
  const chamadas: Array<{ metodo: string; caminho: string; corpo?: any; opcoes?: any }> = [];
  const executa = (metodo: string) => async (caminho: string, a?: any, b?: any) => {
    chamadas.push({ metodo, caminho, corpo: metodo === 'GET' ? undefined : a, opcoes: metodo === 'GET' ? a : b });
    const r = rotas[`${metodo} ${caminho}`];
    if (r instanceof Error) throw r;
    return r;
  };
  return { chamadas, get: executa('GET') as any, post: executa('POST') as any, put: executa('PUT') as any };
}

describe('Idosos e score pelo apiClient', () => {
  // cada arquivo de teste roda em um processo próprio: não precisa restaurar o ambiente
  beforeEach(() => {
    process.env.EXPO_PUBLIC_USAR_MOCK = 'false';
  });

  test('idosos: resposta do contrato (nomeCompleto, genero) vira o modelo da tela', async () => {
    const c = cliente({ 'GET /api/v1/familiares/fam-1/idosos': [{ id: IDOSO, nomeCompleto: 'Maria Silva', dataNascimento: '1950-03-02', genero: 'F' }] });
    const [idoso] = await listarIdososDoFamiliar('fam-1', { cliente: c });
    assert.equal(idoso.idosoId, IDOSO);
    assert.equal(idoso.nome, 'Maria Silva');
    assert.equal(idoso.sexo, 'F');
  });

  test('idosos: lista vazia fica vazia e erro lança (mock desligado)', async () => {
    assert.deepEqual(await listarIdososDoFamiliar('fam-1', { cliente: cliente({ 'GET /api/v1/familiares/fam-1/idosos': [] }) }), []);
    const erro = new ApiError(0, null, '/x');
    await assert.rejects(listarIdososDoFamiliar('fam-1', { cliente: cliente({ 'GET /api/v1/familiares/fam-1/idosos': erro }) }), (e: any) => e === erro);
  });

  test('idosos: salvar e atualizar mandam IdosoRequest e, em erro, lançam sem criar idoso local', async () => {
    const dados = { nome: ' Maria Silva ', dataNascimento: '02/03/1950', sexo: 'F', celular: '11999990000' };
    const c = cliente({
      'POST /api/v1/idosos': { id: IDOSO, nomeCompleto: 'Maria Silva', dataNascimento: '1950-03-02', genero: 'F' },
      [`PUT /api/v1/idosos/${IDOSO}`]: { id: IDOSO, nomeCompleto: 'Maria Silva', dataNascimento: '1950-03-02', genero: 'F' },
    });
    const criado = await salvarCadastroIdoso(dados, { cliente: c });
    assert.deepEqual(c.chamadas[0].corpo, { nomeCompleto: 'Maria Silva', dataNascimento: '1950-03-02', genero: 'F' });
    assert.equal(criado.idosoId, IDOSO);
    await atualizarDadosIdoso(IDOSO, dados, { cliente: c });
    assert.equal(c.chamadas[1].caminho, `/api/v1/idosos/${IDOSO}`);

    const falha = cliente({ 'POST /api/v1/idosos': new ApiError(400, null, '/x'), [`PUT /api/v1/idosos/${IDOSO}`]: new ApiError(403, null, '/x') });
    await assert.rejects(salvarCadastroIdoso(dados, { cliente: falha }), (e: any) => e.status === 400);
    await assert.rejects(atualizarDadosIdoso(IDOSO, dados, { cliente: falha }), (e: any) => e.status === 403);
  });

  test('idosoIdDoServidor: id local, vazio ou nulo não vai para a rede', () => {
    assert.equal(idosoIdDoServidor(IDOSO), IDOSO);
    assert.equal(idosoIdDoServidor('idoso-local-1730000000000'), null);
    assert.equal(idosoIdDoServidor(''), null);
    assert.equal(idosoIdDoServidor(null), null);
    assert.equal(idosoIdDoServidor(undefined), null);
  });

  test('score: GET no path, resposta vira o modelo da tela e erro com mock desligado lança', async () => {
    const path = `/api/v1/insight/idosos/${IDOSO}/score-risco/recente`;
    const c = cliente({ [`GET ${path}`]: { idosoId: IDOSO, nomeIdoso: 'Maria', score: 20, diasComDadosValidos: 7, fatores: [], coletadoEm: new Date().toISOString() } });
    const score = await buscarScoreBemEstar(IDOSO, 'PREMIUM', { cliente: c });
    assert.equal(c.chamadas[0].caminho, path);
    assert.equal(score.nomeIdoso, 'Maria');
    assert.equal(score.score, 20);

    const erro = new ApiError(403, null, path);
    await assert.rejects(buscarScoreBemEstar(IDOSO, 'PREMIUM', { cliente: cliente({ [`GET ${path}`]: erro }) }), (e: any) => e === erro);
  });

  test('plano FREE não chama a rede (paywall)', async () => {
    const c = cliente();
    const r = await buscarScoreBemEstar(IDOSO, 'FREE', { cliente: c });
    assert.equal(r.requerPremium, true);
    assert.equal(c.chamadas.length, 0);
  });
});
