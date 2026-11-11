import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { listarIdososDoFamiliar } from '../elderlyService';
import { escolherIdosoSelecionado } from '../selecaoIdoso';
import { ApiError } from '../apiClient';

const IDOSO_A = 'e3b0c442-98fc-1c14-9afc-432100000001';
const IDOSO_B = 'e3b0c442-98fc-1c14-9afc-432100000002';

function jwtComSub(sub: string): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64({ sub })}.assinatura`;
}

function clienteFake(rotas: Record<string, unknown> = {}) {
  const caminhos: string[] = [];
  const get = async (caminho: string) => {
    caminhos.push(caminho);
    const r = rotas[caminho];
    if (r instanceof Error) throw r;
    return r ?? [];
  };
  return { caminhos, get: get as any, post: (async () => ({})) as any, put: (async () => ({})) as any };
}

describe('Correção 3/3: familiar e idoso selecionado (#82)', () => {
  // cada arquivo de teste roda em um processo próprio: não precisa restaurar o ambiente
  beforeEach(() => {
    process.env.EXPO_PUBLIC_USAR_MOCK = 'false';
  });

  test('sem familiarId usa o sub do JWT da sessão', async () => {
    const cliente = clienteFake({
      '/api/v1/familiares/fam-jwt/idosos': [{ id: IDOSO_A, nomeCompleto: 'Maria Silva' }],
    });
    const lista = await listarIdososDoFamiliar(undefined, {
      cliente,
      obterToken: async () => jwtComSub('fam-jwt'),
    });
    assert.deepEqual(cliente.caminhos, ['/api/v1/familiares/fam-jwt/idosos']);
    assert.equal(lista[0].idosoId, IDOSO_A);
  });

  test('familiarId nulo também cai no sub do JWT', async () => {
    const cliente = clienteFake();
    await listarIdososDoFamiliar(null, { cliente, obterToken: async () => jwtComSub('fam-jwt') });
    assert.deepEqual(cliente.caminhos, ['/api/v1/familiares/fam-jwt/idosos']);
  });

  test('sem familiarId e sem token cai no alias "me"', async () => {
    const cliente = clienteFake();
    await listarIdososDoFamiliar(undefined, { cliente, obterToken: async () => null });
    assert.deepEqual(cliente.caminhos, ['/api/v1/familiares/me/idosos']);
  });

  test('token ilegível ou erro ao obter o token também cai em "me"', async () => {
    const ilegivel = clienteFake();
    await listarIdososDoFamiliar(undefined, { cliente: ilegivel, obterToken: async () => 'nao-e-jwt' });
    assert.deepEqual(ilegivel.caminhos, ['/api/v1/familiares/me/idosos']);

    const comFalha = clienteFake();
    await listarIdososDoFamiliar(undefined, {
      cliente: comFalha,
      obterToken: async () => {
        throw new Error('secure store indisponível');
      },
    });
    assert.deepEqual(comFalha.caminhos, ['/api/v1/familiares/me/idosos']);
  });

  test('familiarId explícito tem prioridade sobre o token', async () => {
    const cliente = clienteFake();
    await listarIdososDoFamiliar('fam-explicito', { cliente, obterToken: async () => jwtComSub('fam-jwt') });
    assert.deepEqual(cliente.caminhos, ['/api/v1/familiares/fam-explicito/idosos']);
  });

  test('sem mock, erro da API é propagado e não vira lista local', async () => {
    const erro = new ApiError(500, null, '/x');
    const cliente = clienteFake({ '/api/v1/familiares/me/idosos': erro });
    await assert.rejects(
      listarIdososDoFamiliar(undefined, { cliente, obterToken: async () => null }),
      (e: unknown) => e === erro
    );
  });

  test('sem mock, lista vazia da API fica vazia (sem idosos de demonstração)', async () => {
    const cliente = clienteFake({ '/api/v1/familiares/me/idosos': [] });
    assert.deepEqual(await listarIdososDoFamiliar(undefined, { cliente, obterToken: async () => null }), []);
  });
});

describe('escolherIdosoSelecionado: mantém a seleção, senão o primeiro, senão null', () => {
  const lista = [{ idosoId: IDOSO_A }, { idosoId: IDOSO_B }];

  test('mantém o selecionado quando ele está na lista', () => {
    assert.equal(escolherIdosoSelecionado(lista, IDOSO_B), lista[1]);
  });

  test('cai no primeiro sem seleção ou com seleção que saiu da lista', () => {
    assert.equal(escolherIdosoSelecionado(lista, null), lista[0]);
    assert.equal(escolherIdosoSelecionado(lista, undefined), lista[0]);
    assert.equal(escolherIdosoSelecionado(lista, 'id-que-saiu'), lista[0]);
  });

  test('lista vazia não seleciona ninguém', () => {
    assert.equal(escolherIdosoSelecionado([], IDOSO_A), null);
    assert.equal(escolherIdosoSelecionado([], null), null);
  });
});
