import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../apiClient';
import { ExclusaoError } from '../exclusaoContaService';
import { TOKEN_STORAGE_KEYS, setSecureStoreAdapter } from '../tokenStorageService';
import { CHAVE_APARELHO_PAREADO, definirArmazenamentoAparelhoPareado } from '../aparelhoPareadoService';
import { CHAVE_IDENTIFICADOR_APARELHO } from '../aparelhoService';
import {
  __simularFalhaBanco,
  obterContatosDoCache,
  salvarContatosNoCache,
} from '../contatoEmergenciaDatabase';
import { obterRotinasDoCache, salvarRotinasNoCache } from '../medicamentoDatabase';
import { obterSyncRelogioLocal, salvarSyncRelogioLocal } from '../relogioDatabase';
import { enfileirarSos, tamanhoFilaSosEmMemoria } from '../sosQueueService';
import {
  CHAVES_SECURE_STORE,
  apagarDadosLocais,
  excluirContaEDadosLocais,
  type EtapaLimpeza,
} from '../limpezaLocalService';

const IDOSO = 'idoso-1';
const SUB = '5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f7a8b9';
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const sessao = { obterToken: async () => `${b64({ alg: 'none' })}.${b64({ sub: SUB })}.x` };
const aceita = {
  post: (async () => ({ protocolo: 'P-123', prazoDias: 15, solicitadoEm: '2026-11-14T12:00:00.000Z' })) as any,
};
const recusa = { post: (async () => { throw new ApiError(409, null, 'u'); }) as any };

function criarSecureStore() {
  const cofre = new Map<string, string>();
  return {
    cofre,
    isAvailableAsync: async () => true,
    getItemAsync: async (k: string) => cofre.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => { cofre.set(k, v); },
    deleteItemAsync: async (k: string) => { cofre.delete(k); },
  };
}

let store: ReturnType<typeof criarSecureStore>;

/** Captura o console.warn durante `fn`, para conferir o que foi logado. */
async function capturarAvisos<T>(fn: () => Promise<T>): Promise<{ resultado: T; avisos: string[] }> {
  const original = console.warn;
  const avisos: string[] = [];
  console.warn = (...args: unknown[]) => { avisos.push(args.map(String).join(' ')); };
  try {
    return { resultado: await fn(), avisos };
  } finally {
    console.warn = original;
  }
}

async function popularAparelho() {
  for (const chave of CHAVES_SECURE_STORE) store.cofre.set(chave, `valor-${chave}`);
  await salvarContatosNoCache(IDOSO, [
    {
      id: 'c1',
      nome: 'Maria Silva',
      parentesco: 'Filha',
      telefone: '(11) 98888-7777',
      ordem: 1,
      whatsapp: true,
      iniciais: 'MS',
      corAvatar: '#EEF2FF',
      corTexto: '#4338CA',
      ativo: true,
    },
  ]);
  await salvarRotinasNoCache(IDOSO, [{ id: 'r1', medicamentoNome: 'Losartana', dosagem: '50 mg', horario: '08:00' }]);
  await salvarSyncRelogioLocal(IDOSO, '2026-11-14T10:00:00.000Z');
  await enfileirarSos(IDOSO, { idempotencyKey: 'sos-1' });
}

async function assertAparelhoVazio() {
  assert.deepEqual(await obterContatosDoCache(IDOSO), [], 'banco de contatos');
  assert.deepEqual(await obterRotinasDoCache(IDOSO), [], 'banco de medicamentos');
  assert.equal(await obterSyncRelogioLocal(IDOSO), null, 'banco do relógio');
  assert.equal(tamanhoFilaSosEmMemoria(), 0, 'fila do SOS');
  for (const chave of CHAVES_SECURE_STORE) assert.equal(store.cofre.has(chave), false, `secure-store: ${chave}`);
  assert.equal(store.cofre.size, 0);
}

describe('Exclusão da conta: limpeza do aparelho (HU-022)', () => {
  beforeEach(() => {
    __simularFalhaBanco(false);
    store = criarSecureStore();
    setSecureStoreAdapter(store);
    definirArmazenamentoAparelhoPareado(store);
  });

  test('o secure-store tem as chaves de tokens, pareamento e identificador do aparelho', () => {
    assert.deepEqual([...CHAVES_SECURE_STORE].sort(), [
      TOKEN_STORAGE_KEYS.ACCESS_TOKEN,
      TOKEN_STORAGE_KEYS.ACCESS_TOKEN_EXPIRES_AT,
      TOKEN_STORAGE_KEYS.REFRESH_TOKEN,
      CHAVE_APARELHO_PAREADO,
      CHAVE_IDENTIFICADOR_APARELHO,
    ].sort());
  });

  test('pedido aceito: cada banco e cada chave do secure-store ficam vazios', async () => {
    await popularAparelho();
    const { comprovante, limpeza } = await excluirContaEDadosLocais('EXCLUIR', {
      cliente: aceita,
      permitirSimulacao: false,
      ...sessao,
    });
    assert.equal(comprovante.protocolo, 'P-123');
    assert.deepEqual(limpeza.falhas, []);
    await assertAparelhoVazio();
  });

  test('pedido recusado: nada é apagado', async () => {
    await popularAparelho();
    await assert.rejects(
      excluirContaEDadosLocais('EXCLUIR', { cliente: recusa, permitirSimulacao: false, ...sessao }),
      (e: unknown) => e instanceof ExclusaoError
    );
    assert.equal((await obterContatosDoCache(IDOSO)).length, 1);
    assert.equal((await obterRotinasDoCache(IDOSO)).length, 1);
    assert.equal(store.cofre.size, CHAVES_SECURE_STORE.length);
  });

  test('falha ao apagar um banco é logada sem PII e não interrompe a limpeza dos outros', async () => {
    const executadas: string[] = [];
    const etapas: EtapaLimpeza[] = [
      { nome: 'banco:medicamentos', executar: async () => { executadas.push('medicamentos'); } },
      {
        nome: 'banco:contatos',
        executar: async () => { throw new Error('UNIQUE falhou para Maria Silva (11) 98888-7777'); },
      },
      { nome: 'banco:relogio', executar: async () => { executadas.push('relogio'); } },
    ];

    const { resultado, avisos } = await capturarAvisos(() => apagarDadosLocais(etapas));

    assert.deepEqual(resultado.falhas, ['banco:contatos']);
    assert.deepEqual(executadas, ['medicamentos', 'relogio']);
    assert.equal(avisos.length, 1);
    assert.match(avisos[0], /banco:contatos/);
    assert.equal(/Maria|98888|UNIQUE/.test(avisos[0]), false, 'o log não pode trazer a mensagem do erro');
  });

  test('com o banco de contatos falhando, os outros bancos e o secure-store são apagados', async () => {
    await popularAparelho();
    __simularFalhaBanco(true);

    const { resultado, avisos } = await capturarAvisos(() =>
      excluirContaEDadosLocais('EXCLUIR', { cliente: aceita, permitirSimulacao: false, ...sessao })
    );

    assert.deepEqual(resultado.limpeza.falhas, ['banco:contatos']);
    assert.deepEqual(await obterRotinasDoCache(IDOSO), []);
    assert.equal(await obterSyncRelogioLocal(IDOSO), null);
    assert.equal(tamanhoFilaSosEmMemoria(), 0);
    assert.equal(store.cofre.size, 0);
    assert.ok(avisos.some((a) => a.includes('banco:contatos')));
    assert.ok(avisos.every((a) => !/Maria|98888/.test(a)));
  });

  test('falha numa chave do secure-store não impede apagar as outras', async () => {
    for (const chave of CHAVES_SECURE_STORE) store.cofre.set(chave, 'x');
    const original = store.deleteItemAsync;
    store.deleteItemAsync = async (k: string) => {
      if (k === TOKEN_STORAGE_KEYS.REFRESH_TOKEN) throw new Error('keystore indisponível');
      await original(k);
    };

    const { resultado } = await capturarAvisos(() => apagarDadosLocais());

    assert.deepEqual(resultado.falhas, [`secure-store:${TOKEN_STORAGE_KEYS.REFRESH_TOKEN}`]);
    assert.deepEqual([...store.cofre.keys()], [TOKEN_STORAGE_KEYS.REFRESH_TOKEN]);
  });
});
