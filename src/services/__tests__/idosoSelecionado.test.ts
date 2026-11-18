import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { listarIdososDoFamiliar, SessaoSemFamiliarError } from '../elderlyService';
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

  test('usa sempre o sub do JWT da sessão (DAS v2.1 §4.1)', async () => {
    const cliente = clienteFake({
      '/api/v1/familiares/fam-jwt/idosos': [{ id: IDOSO_A, nomeCompleto: 'Maria Silva' }],
    });
    const lista = await listarIdososDoFamiliar({
      cliente,
      obterToken: async () => jwtComSub('fam-jwt'),
    });
    assert.deepEqual(cliente.caminhos, ['/api/v1/familiares/fam-jwt/idosos']);
    assert.equal(lista[0].idosoId, IDOSO_A);
  });

  test('não aceita id externo: a assinatura só recebe as opções de rede', async () => {
    const cliente = clienteFake();
    // perfil.id do identity passado por engano é ignorado (não vira opção conhecida)
    await listarIdososDoFamiliar({ cliente, obterToken: async () => jwtComSub('fam-jwt'), ...({ familiarId: 'perfil-identity' } as any) });
    assert.deepEqual(cliente.caminhos, ['/api/v1/familiares/fam-jwt/idosos']);
  });

  test('sem token não chama a API e lança SessaoSemFamiliarError (sem alias "me")', async () => {
    const cliente = clienteFake();
    await assert.rejects(
      listarIdososDoFamiliar({ cliente, obterToken: async () => null }),
      (e: unknown) => e instanceof SessaoSemFamiliarError
    );
    assert.deepEqual(cliente.caminhos, []);
  });

  test('token ilegível, sem sub ou erro ao obter o token também lançam sem chamar a API', async () => {
    const semSub = (() => {
      const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
      return `${b64({ alg: 'none' })}.${b64({ name: 'x' })}.a`;
    })();
    for (const obterToken of [
      async () => 'nao-e-jwt',
      async () => semSub,
      async () => {
        throw new Error('secure store indisponível');
      },
    ]) {
      const cliente = clienteFake();
      await assert.rejects(listarIdososDoFamiliar({ cliente, obterToken }), (e: unknown) => e instanceof SessaoSemFamiliarError);
      assert.deepEqual(cliente.caminhos, []);
    }
  });

  test('sem mock, erro da API é propagado e não vira lista local', async () => {
    const erro = new ApiError(500, null, '/x');
    const cliente = clienteFake({ '/api/v1/familiares/fam-jwt/idosos': erro });
    await assert.rejects(
      listarIdososDoFamiliar({ cliente, obterToken: async () => jwtComSub('fam-jwt') }),
      (e: unknown) => e === erro
    );
  });

  test('sem mock, lista vazia da API fica vazia (sem idosos de demonstração)', async () => {
    const cliente = clienteFake({ '/api/v1/familiares/fam-jwt/idosos': [] });
    assert.deepEqual(await listarIdososDoFamiliar({ cliente, obterToken: async () => jwtComSub('fam-jwt') }), []);
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
