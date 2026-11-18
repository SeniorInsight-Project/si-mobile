import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  listarIdososDoFamiliar,
  salvarCadastroIdoso,
  atualizarIdoso,
  obterIdoso,
  montarIdosoRequestAtualizado,
  idosoIdDoServidor,
} from '../elderlyService';
import { buscarScoreBemEstar } from '../riskScoreService';
import { ApiError } from '../apiClient';

const IDOSO = 'e3b0c442-98fc-1c14-9afc-432100000001';
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
const tokenFam1 = async () => `${b64({ alg: 'none' })}.${b64({ sub: 'fam-1' })}.a`;

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
    const [idoso] = await listarIdososDoFamiliar({ cliente: c, obterToken: tokenFam1 });
    assert.equal(idoso.idosoId, IDOSO);
    assert.equal(idoso.nome, 'Maria Silva');
    assert.equal(idoso.sexo, 'F');
  });

  test('idosos: lista vazia fica vazia e erro lança (mock desligado)', async () => {
    assert.deepEqual(await listarIdososDoFamiliar({ cliente: cliente({ 'GET /api/v1/familiares/fam-1/idosos': [] }), obterToken: tokenFam1 }), []);
    const erro = new ApiError(0, null, '/x');
    await assert.rejects(listarIdososDoFamiliar({ cliente: cliente({ 'GET /api/v1/familiares/fam-1/idosos': erro }), obterToken: tokenFam1 }), (e: any) => e === erro);
  });

  test('idosos: salvar manda IdosoRequest e, em erro, lança sem criar idoso local', async () => {
    const dados = { nome: ' Maria Silva ', dataNascimento: '02/03/1950', sexo: 'F', celular: '11999990000' };
    const c = cliente({
      'POST /api/v1/idosos': { id: IDOSO, nomeCompleto: 'Maria Silva', dataNascimento: '1950-03-02', genero: 'F' },
    });
    const criado = await salvarCadastroIdoso(dados, { cliente: c });
    assert.deepEqual(c.chamadas[0].corpo, { nomeCompleto: 'Maria Silva', dataNascimento: '1950-03-02', genero: 'F' });
    assert.equal(criado.idosoId, IDOSO);
    assert.equal(criado.dataNascimento, '02/03/1950', 'data ISO da API vira DD/MM/AAAA no modelo da tela');

    const falha = cliente({ 'POST /api/v1/idosos': new ApiError(400, null, '/x') });
    await assert.rejects(salvarCadastroIdoso(dados, { cliente: falha }), (e: any) => e.status === 400);
  });

  const COMPLETO = {
    id: IDOSO,
    nomeCompleto: 'João Pereira',
    dataNascimento: '1946-05-10',
    genero: 'Masculino',
    cpf: '123.456.789-00',
    fotoPerfilUrl: 'https://exemplo.org/f.png',
    tipoSanguineo: 'A+',
    alergias: 'Dipirona',
    logradouro: 'Rua A',
    numero: '10',
    bairro: 'Centro',
    cidade: 'Recife',
    estado: 'PE',
    cep: '50000-000',
    planoSaude: 'Plano X',
    observacoesSocorros: 'Usa marca-passo',
    comorbidades: ['Hipertensão Arterial Sistêmica'],
    limitesBasais: {},
    criadoEm: '2026-11-18T03:30:06Z',
    atualizadoEm: '2026-11-18T03:30:06Z',
  };

  test('perfil: carrega por GET /api/v1/idosos/{id} e erro lança (mock desligado)', async () => {
    const c = cliente({ [`GET /api/v1/idosos/${IDOSO}`]: COMPLETO });
    assert.deepEqual(await obterIdoso(IDOSO, { cliente: c }), COMPLETO);
    assert.equal(c.chamadas[0].caminho, `/api/v1/idosos/${IDOSO}`);
    const erro = new ApiError(404, null, '/x');
    await assert.rejects(obterIdoso(IDOSO, { cliente: cliente({ [`GET /api/v1/idosos/${IDOSO}`]: erro }) }), (e: any) => e === erro);
  });

  test('perfil: PUT parte do cadastro completo e troca só os campos editados', async () => {
    const edicao = { nome: ' João P. Pereira ', dataNascimento: '11/05/1946', sexo: 'Masculino', tipoSanguineo: 'O-' };
    const corpo = montarIdosoRequestAtualizado(COMPLETO as any, edicao);
    assert.deepEqual(corpo, {
      nomeCompleto: 'João P. Pereira',
      dataNascimento: '1946-05-11',
      genero: 'Masculino',
      cpf: '123.456.789-00',
      fotoPerfilUrl: 'https://exemplo.org/f.png',
      tipoSanguineo: 'O-',
      alergias: 'Dipirona',
      logradouro: 'Rua A',
      numero: '10',
      bairro: 'Centro',
      cidade: 'Recife',
      estado: 'PE',
      cep: '50000-000',
      planoSaude: 'Plano X',
      observacoesSocorros: 'Usa marca-passo',
    });
    assert.equal('celular' in corpo, false, 'celular não existe no contrato');
    assert.equal('comorbidades' in corpo, false, 'campos só de resposta não vão no PUT');
  });

  test('perfil: campos ausentes na resposta vão como null e tipo sanguíneo vazio limpa', () => {
    const minimo = { id: IDOSO, nomeCompleto: 'Ana', dataNascimento: '1950-01-01', comorbidades: [], criadoEm: '', atualizadoEm: '' };
    const corpo = montarIdosoRequestAtualizado(minimo as any, { nome: 'Ana', dataNascimento: '01/01/1950', sexo: '', tipoSanguineo: '' });
    assert.equal(corpo.cpf, null);
    assert.equal(corpo.genero, null);
    assert.equal(corpo.tipoSanguineo, null);
  });

  test('perfil: data inválida não monta o PUT', () => {
    assert.throws(() =>
      montarIdosoRequestAtualizado(COMPLETO as any, { nome: 'João', dataNascimento: '1946-05-10', sexo: 'Masculino', tipoSanguineo: null })
    );
  });

  test('perfil: atualizarIdoso faz o PUT no id do cadastro e devolve a resposta; erro lança', async () => {
    const salvo = { ...COMPLETO, tipoSanguineo: 'O-' };
    const c = cliente({ [`PUT /api/v1/idosos/${IDOSO}`]: salvo });
    const r = await atualizarIdoso(COMPLETO as any, { nome: 'João Pereira', dataNascimento: '10/05/1946', sexo: 'Masculino', tipoSanguineo: 'O-' }, { cliente: c });
    assert.equal(c.chamadas[0].metodo, 'PUT');
    assert.equal(c.chamadas[0].caminho, `/api/v1/idosos/${IDOSO}`);
    assert.equal(c.chamadas[0].corpo.cpf, '123.456.789-00');
    assert.equal(r.tipoSanguineo, 'O-');

    const falha = cliente({ [`PUT /api/v1/idosos/${IDOSO}`]: new ApiError(403, null, '/x') });
    await assert.rejects(
      atualizarIdoso(COMPLETO as any, { nome: 'João', dataNascimento: '10/05/1946', sexo: 'Masculino', tipoSanguineo: null }, { cliente: falha }),
      (e: any) => e.status === 403
    );
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
