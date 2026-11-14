import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAVE_APARELHO_PAREADO,
  definirArmazenamentoAparelhoPareado,
  esquecerAparelhoPareado,
  marcarAparelhoPareado,
  obterAparelhoPareado,
} from '../aparelhoPareadoService';
import {
  MENSAGENS_PAREAMENTO,
  PareamentoError,
  codigoDoDeepLink,
  mensagemBoasVindas,
  parearComCodigo,
  plataformaDoContrato,
  type Aparelho,
} from '../pareamentoService';
import { ApiError } from '../apiClient';

function storeEmMemoria() {
  const dados = new Map<string, string>();
  return {
    dados,
    getItemAsync: async (k: string) => dados.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => {
      dados.set(k, v);
    },
    deleteItemAsync: async (k: string) => {
      dados.delete(k);
    },
  };
}

const APARELHO: Aparelho = { identificador: 'uuid-do-aparelho', plataforma: 'IOS' };

function jwt(roles: string[]): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'none' })}.${b64({ sub: 'u1', realm_access: { roles } })}.x`;
}

const IDOSO_ID = '3f2b8c1e-5d4a-4b7e-9c10-6a1d2e3f4a5b';

const RESGATE_OK = {
  perfil: { id: 'perfil-1', nome: 'Maria Aparecida Silva' },
  sessaoAparelhoId: 'sessao-9',
  idosoId: IDOSO_ID,
  tokens: { accessToken: jwt(['idoso']), refreshToken: 'r1', expiresIn: 300, tokenType: 'Bearer' },
};

const cliente = (resposta: unknown | (() => never)) =>
  ({
    post: (async () => (typeof resposta === 'function' ? (resposta as () => never)() : resposta)) as any,
  });
const falhaCom = (status: number) => () => {
  throw new ApiError(status, null, 'http://x/y');
};

describe('Aparelho pareado (HU-007: depois do pareamento, abre sempre no Modo Idoso)', () => {
  let store: ReturnType<typeof storeEmMemoria>;
  beforeEach(() => {
    store = storeEmMemoria();
    definirArmazenamentoAparelhoPareado(store);
  });

  test('marca, lê e esquece o pareamento no secure store', async () => {
    assert.equal(await obterAparelhoPareado(), null);
    assert.equal(await marcarAparelhoPareado({ perfilId: 'perfil-1', nome: 'Maria' }), true);
    const r = await obterAparelhoPareado();
    assert.equal(r?.perfilId, 'perfil-1');
    assert.equal(r?.nome, 'Maria');
    assert.ok((r?.pareadoEm ?? 0) > 0);
    await esquecerAparelhoPareado();
    assert.equal(await obterAparelhoPareado(), null);
  });

  test('registro corrompido conta como não pareado', async () => {
    store.dados.set(CHAVE_APARELHO_PAREADO, '{quebrado');
    assert.equal(await obterAparelhoPareado(), null);
    store.dados.set(CHAVE_APARELHO_PAREADO, JSON.stringify({ nome: 'Maria' }));
    assert.equal(await obterAparelhoPareado(), null);
  });

  test('falha do secure store não derruba o pareamento', async () => {
    definirArmazenamentoAparelhoPareado({
      ...store,
      setItemAsync: async () => {
        throw new Error('keystore indisponível');
      },
    });
    assert.equal(await marcarAparelhoPareado({ perfilId: 'p', nome: 'M' }), false);
  });

  test('resgate com sucesso salva os tokens e depois marca o aparelho como pareado', async () => {
    const ordem: string[] = [];
    await parearComCodigo('k7p2qx', APARELHO, {
      cliente: cliente(RESGATE_OK),
      salvar: async () => {
        ordem.push('tokens');
      },
      marcarPareado: async (d) => {
        ordem.push(`pareado:${d.perfilId}:${d.nome}:${d.idosoId}`);
      },
    });
    assert.deepEqual(ordem, ['tokens', `pareado:perfil-1:Maria Aparecida Silva:${IDOSO_ID}`]);
  });

  test('guarda o idosoId do care junto do perfilId e devolve na leitura', async () => {
    assert.equal(await marcarAparelhoPareado({ perfilId: 'perfil-1', nome: 'Maria', idosoId: IDOSO_ID }), true);
    const r = await obterAparelhoPareado();
    assert.equal(r?.idosoId, IDOSO_ID);
    assert.equal(r?.perfilId, 'perfil-1');
  });

  test('pareamento sem idosoId fica sem idosoId: o perfilId nunca ocupa o lugar dele', async () => {
    await marcarAparelhoPareado({ perfilId: 'perfil-1', nome: 'Maria' });
    const r = await obterAparelhoPareado();
    assert.equal(r?.idosoId, undefined);
    store.dados.set(CHAVE_APARELHO_PAREADO, JSON.stringify({ perfilId: 'perfil-1', nome: 'Maria', pareadoEm: 1 }));
    assert.equal((await obterAparelhoPareado())?.idosoId, undefined);
  });

  test('registro com idosoId que não é texto é ignorado', async () => {
    store.dados.set(CHAVE_APARELHO_PAREADO, JSON.stringify({ perfilId: 'p', nome: 'M', idosoId: 7 }));
    assert.equal((await obterAparelhoPareado())?.idosoId, undefined);
  });

  test('resgate devolve o idosoId do contrato e o repassa para guardar', async () => {
    let guardado: unknown;
    const r = await parearComCodigo('k7p2qx', APARELHO, {
      cliente: cliente(RESGATE_OK),
      salvar: async () => {},
      marcarPareado: async (d) => {
        guardado = d;
      },
    });
    assert.equal(r.idosoId, IDOSO_ID);
    assert.deepEqual(guardado, { perfilId: 'perfil-1', nome: 'Maria Aparecida Silva', idosoId: IDOSO_ID });
  });

  test('resgate com idosoId null (código gerado sem idoso) não inventa idosoId', async () => {
    const r = await parearComCodigo('k7p2qx', APARELHO, {
      cliente: cliente({ ...RESGATE_OK, idosoId: null }),
      salvar: async () => {},
      marcarPareado: async () => {},
    });
    assert.equal(r.idosoId, undefined);
    assert.notEqual(r.idosoId, r.perfilId);
  });

  test('resgate sem o campo idosoId também fica sem idosoId', async () => {
    const { idosoId: _omitido, ...semIdoso } = RESGATE_OK;
    const r = await parearComCodigo('k7p2qx', APARELHO, {
      cliente: cliente(semIdoso),
      salvar: async () => {},
      marcarPareado: async () => {},
    });
    assert.equal(r.idosoId, undefined);
  });

  test('resgate recusado não marca o aparelho', async () => {
    let marcou = false;
    for (const status of [404, 409, 410, 0]) {
      await assert.rejects(
        parearComCodigo('K7P2QX', APARELHO, {
          cliente: cliente(falhaCom(status)),
          salvar: async () => {},
          marcarPareado: async () => {
            marcou = true;
          },
        }),
        PareamentoError,
      );
    }
    assert.equal(marcou, false);
  });

  test('mensagens do card: 410 vencido, 409 já usado, 404 não encontrado, sem rede', async () => {
    const msg = async (status: number) => {
      try {
        await parearComCodigo('K7P2QX', APARELHO, {
          cliente: cliente(falhaCom(status)),
          salvar: async () => {},
          marcarPareado: async () => {},
        });
      } catch (e) {
        return (e as Error).message;
      }
      return '';
    };
    assert.equal(await msg(410), 'Código vencido. Peça um novo ao seu familiar');
    assert.equal(await msg(409), 'Esse código já foi usado');
    assert.equal(await msg(404), 'Código não encontrado');
    assert.equal(await msg(0), MENSAGENS_PAREAMENTO.SEM_CONEXAO);
    assert.match(MENSAGENS_PAREAMENTO.SEM_CONEXAO, /internet/i);
  });

  test('cenário 1 da HU-007: o código 482913 do DRS é aceito pelo formato do contrato', async () => {
    let enviado: any = null;
    await parearComCodigo('482913', APARELHO, {
      cliente: { post: (async (_c: string, corpo: unknown) => ((enviado = corpo), RESGATE_OK)) as any },
      salvar: async () => {},
      marcarPareado: async () => {},
    });
    assert.deepEqual(enviado, { codigo: '482913', identificadorAparelho: 'uuid-do-aparelho', plataforma: 'IOS' });
    assert.equal(mensagemBoasVindas(RESGATE_OK.perfil.nome), 'Olá, Maria');
  });
});

describe('Deep link seniorinsight://pareamento?codigo=... e plataforma', () => {
  test('lê o código do link já interpretado pelo Linking.parse', () => {
    assert.equal(codigoDoDeepLink({ hostname: 'pareamento', path: null, queryParams: { codigo: 'k7p2qx' } }), 'K7P2QX');
    assert.equal(codigoDoDeepLink({ hostname: null, path: 'pareamento', queryParams: { codigo: 'K7P2QX' } }), 'K7P2QX');
    assert.equal(codigoDoDeepLink({ hostname: 'pareamento', path: '', queryParams: { codigo: 'ABCD1234' } }), 'ABCD1234');
  });

  test('recusa links de outro destino ou com código fora do contrato', () => {
    assert.equal(codigoDoDeepLink({ hostname: 'convite', path: 'abc', queryParams: { codigo: 'K7P2QX' } }), null);
    assert.equal(codigoDoDeepLink({ hostname: 'pareamento', queryParams: { codigo: 'K7P' } }), null);
    assert.equal(codigoDoDeepLink({ hostname: 'pareamento', queryParams: { codigo: 'K7P2QX9AZ' } }), null);
    assert.equal(codigoDoDeepLink({ hostname: 'pareamento', queryParams: { codigo: '<script>' } }), null);
    assert.equal(codigoDoDeepLink({ hostname: 'pareamento', queryParams: { codigo: ['K7P2QX'] } }), null);
    assert.equal(codigoDoDeepLink({ hostname: 'pareamento', queryParams: {} }), null);
  });

  test('Platform.OS vira o enum Plataforma do contrato', () => {
    assert.equal(plataformaDoContrato('ios'), 'IOS');
    assert.equal(plataformaDoContrato('android'), 'ANDROID');
  });

  test('boas-vindas sem nome não quebra', () => {
    assert.equal(mensagemBoasVindas(''), 'Olá!');
    assert.equal(mensagemBoasVindas('Dona Maria'), 'Olá, Maria');
  });
});
