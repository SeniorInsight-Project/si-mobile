import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  TOKEN_STORAGE_KEYS,
  setSecureStoreAdapter,
  obterTokens,
  obterExpiracaoAccessToken,
} from '../tokenStorageService';
import {
  MARGEM_RENOVACAO_MS,
  SessaoInvalidaError,
  aoEncerrarSessao,
  configurarSessao,
  desfechoSemCodigo,
  emailNaoVerificado,
  obterAccessTokenValido,
  papeisDoToken,
  renovarSessao,
  salvarSessao,
  sair,
  telaInicialPorPapeis,
  urlRedefinicaoSenha,
  type ProvedorOidc,
  type RespostaTokens,
} from '../authSession';

const AGORA = 1_800_000_000_000;

function criarMockSecureStore() {
  const cofre = new Map<string, string>();
  return {
    cofre,
    isAvailableAsync: async () => true,
    getItemAsync: async (key: string) => (cofre.has(key) ? (cofre.get(key) as string) : null),
    setItemAsync: async (key: string, value: string) => {
      cofre.set(key, String(value));
    },
    deleteItemAsync: async (key: string) => {
      cofre.delete(key);
    },
  };
}

function jwt(payload: Record<string, unknown>): string {
  const b64 = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'RS256' })}.${b64(payload)}.assinatura`;
}

function criarProvedor(renovar: (refresh: string) => Promise<RespostaTokens>) {
  const chamadas = { renovar: [] as string[], revogar: [] as string[] };
  const provedor: ProvedorOidc = {
    renovar: async (refresh) => {
      chamadas.renovar.push(refresh);
      return renovar(refresh);
    },
    revogar: async (refresh) => {
      chamadas.revogar.push(refresh);
    },
  };
  return { provedor, chamadas };
}

let store: ReturnType<typeof criarMockSecureStore>;
let limpezas: number;

function configurar(provedor: ProvedorOidc) {
  configurarSessao({
    provedor,
    relogio: () => AGORA,
    limpadoresLocais: [
      async () => {
        limpezas += 1;
      },
    ],
  });
}

beforeEach(() => {
  store = criarMockSecureStore();
  setSecureStoreAdapter(store);
  limpezas = 0;
});

test('salvarSessao guarda tokens e a expiração (issuedAt + expiresIn) no secure store', async () => {
  configurar(criarProvedor(async () => ({ accessToken: 'x' })).provedor);

  await salvarSessao({ accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 300, issuedAt: AGORA / 1000 });

  assert.deepEqual(await obterTokens(), { accessToken: 'access-1', refreshToken: 'refresh-1' });
  assert.equal(await obterExpiracaoAccessToken(), AGORA + 300_000);
});

test('salvarSessao usa o exp do JWT quando a resposta não traz expires_in', async () => {
  configurar(criarProvedor(async () => ({ accessToken: 'x' })).provedor);
  const token = jwt({ exp: AGORA / 1000 + 120 });

  await salvarSessao({ accessToken: token, refreshToken: 'r' });

  assert.equal(await obterExpiracaoAccessToken(), AGORA + 120_000);
});

test('obterAccessTokenValido devolve o token atual sem renovar quando ainda está longe de vencer', async () => {
  const { provedor, chamadas } = criarProvedor(async () => ({ accessToken: 'novo' }));
  configurar(provedor);
  await salvarSessao({ accessToken: 'atual', refreshToken: 'r', expiresIn: 300, issuedAt: AGORA / 1000 });

  assert.equal(await obterAccessTokenValido(), 'atual');
  assert.equal(chamadas.renovar.length, 0);
});

test('obterAccessTokenValido renova antes de vencer e salva os tokens novos', async () => {
  const { provedor, chamadas } = criarProvedor(async () => ({
    accessToken: 'novo',
    refreshToken: 'refresh-novo',
    expiresIn: 300,
    issuedAt: AGORA / 1000,
  }));
  configurar(provedor);
  const faltando = (MARGEM_RENOVACAO_MS - 1000) / 1000;
  await salvarSessao({ accessToken: 'velho', refreshToken: 'refresh-velho', expiresIn: faltando, issuedAt: AGORA / 1000 });

  assert.equal(await obterAccessTokenValido(), 'novo');
  assert.deepEqual(chamadas.renovar, ['refresh-velho']);
  assert.deepEqual(await obterTokens(), { accessToken: 'novo', refreshToken: 'refresh-novo' });
  assert.equal(await obterExpiracaoAccessToken(), AGORA + 300_000);
});

test('renovarSessao mantém o refresh token atual se o Keycloak não devolver outro', async () => {
  configurar(criarProvedor(async () => ({ accessToken: 'novo', expiresIn: 300, issuedAt: AGORA / 1000 })).provedor);
  await salvarSessao({ accessToken: 'velho', refreshToken: 'refresh-fixo', expiresIn: 300, issuedAt: AGORA / 1000 });

  assert.equal(await renovarSessao(), 'novo');
  assert.equal((await obterTokens()).refreshToken, 'refresh-fixo');
});

test('renovações simultâneas fazem uma única chamada ao Keycloak', async () => {
  let liberar: () => void = () => {};
  const { provedor, chamadas } = criarProvedor(
    () =>
      new Promise((resolve) => {
        liberar = () => resolve({ accessToken: 'novo', expiresIn: 300, issuedAt: AGORA / 1000 });
      }),
  );
  configurar(provedor);
  await salvarSessao({ accessToken: 'velho', refreshToken: 'r', expiresIn: 300, issuedAt: AGORA / 1000 });

  const a = renovarSessao();
  const b = renovarSessao();
  await new Promise((r) => setTimeout(r, 0));
  liberar();

  assert.deepEqual(await Promise.all([a, b]), ['novo', 'novo']);
  assert.equal(chamadas.renovar.length, 1);
});

test('refresh token recusado (invalid_grant) limpa a sessão, os dados locais e avisa o App', async () => {
  configurar(
    criarProvedor(async () => {
      throw Object.assign(new Error('Token is not active'), { code: 'invalid_grant' });
    }).provedor,
  );
  await salvarSessao({ accessToken: 'velho', refreshToken: 'expirado', expiresIn: 1, issuedAt: AGORA / 1000 });
  const motivos: string[] = [];
  const remover = aoEncerrarSessao((m) => motivos.push(m));

  try {
    await assert.rejects(renovarSessao(), (err: any) => err instanceof SessaoInvalidaError);
    assert.deepEqual(await obterTokens(), { accessToken: null, refreshToken: null });
    assert.equal(store.cofre.has(TOKEN_STORAGE_KEYS.ACCESS_TOKEN_EXPIRES_AT), false);
    assert.equal(limpezas, 1);
    assert.deepEqual(motivos, ['expirada']);
  } finally {
    remover();
  }
});

test('obterAccessTokenValido devolve null quando o refresh é recusado', async () => {
  configurar(
    criarProvedor(async () => {
      throw Object.assign(new Error('invalid'), { code: 'invalid_grant' });
    }).provedor,
  );
  await salvarSessao({ accessToken: 'velho', refreshToken: 'expirado', expiresIn: 1, issuedAt: AGORA / 1000 });

  assert.equal(await obterAccessTokenValido(), null);
});

test('falha de rede na renovação mantém a sessão e devolve o token atual', async () => {
  configurar(
    criarProvedor(async () => {
      throw new TypeError('Network request failed');
    }).provedor,
  );
  await salvarSessao({ accessToken: 'atual', refreshToken: 'r', expiresIn: 30, issuedAt: AGORA / 1000 });
  const motivos: string[] = [];
  const remover = aoEncerrarSessao((m) => motivos.push(m));

  try {
    assert.equal(await obterAccessTokenValido(), 'atual');
    assert.equal((await obterTokens()).refreshToken, 'r');
    assert.deepEqual(motivos, []);
  } finally {
    remover();
  }
});

test('sair revoga o refresh token, limpa o secure store e os bancos locais', async () => {
  const { provedor, chamadas } = criarProvedor(async () => ({ accessToken: 'x' }));
  configurar(provedor);
  await salvarSessao({ accessToken: 'a', refreshToken: 'refresh-para-revogar', expiresIn: 300, issuedAt: AGORA / 1000 });
  const motivos: string[] = [];
  const remover = aoEncerrarSessao((m) => motivos.push(m));

  try {
    await sair();
    assert.deepEqual(chamadas.revogar, ['refresh-para-revogar']);
    assert.deepEqual(await obterTokens(), { accessToken: null, refreshToken: null });
    assert.equal(limpezas, 1);
    assert.deepEqual(motivos, ['logout']);
  } finally {
    remover();
  }
});

test('sair encerra a sessão local mesmo se a revogação falhar (sem rede)', async () => {
  configurarSessao({
    relogio: () => AGORA,
    limpadoresLocais: [],
    provedor: {
      renovar: async () => ({ accessToken: 'x' }),
      revogar: async () => {
        throw new TypeError('Network request failed');
      },
    },
  });
  await salvarSessao({ accessToken: 'a', refreshToken: 'r', expiresIn: 300, issuedAt: AGORA / 1000 });

  await sair();

  assert.deepEqual(await obterTokens(), { accessToken: null, refreshToken: null });
});

test('papeisDoToken lê realm_access.roles e telaInicialPorPapeis escolhe a tela', () => {
  const token = jwt({ sub: 'u1', realm_access: { roles: ['familiar', 'offline_access'] } });

  assert.deepEqual(papeisDoToken(token), ['familiar', 'offline_access']);
  assert.deepEqual(papeisDoToken('nao-e-jwt'), []);
  assert.equal(telaInicialPorPapeis(['idoso']), 'ElderlyMode');
  assert.equal(telaInicialPorPapeis(['familiar']), 'Home');
  assert.equal(telaInicialPorPapeis(['medico']), 'AcessoRestrito');
  assert.equal(telaInicialPorPapeis([]), 'AcessoRestrito');
});

test('urlRedefinicaoSenha aponta para o reset-credentials do realm com o client si-mobile', () => {
  assert.equal(
    urlRedefinicaoSenha('http://kc.test/auth/realms/seniorinsight'),
    'http://kc.test/auth/realms/seniorinsight/login-actions/reset-credentials?client_id=si-mobile',
  );
});

test('HU-001: email_verified = false em qualquer token pede a confirmação do e-mail', () => {
  const naoVerificado = jwt({ sub: 'u1', email_verified: false });
  const verificado = jwt({ sub: 'u1', email_verified: true });

  assert.equal(emailNaoVerificado(naoVerificado), true);
  assert.equal(emailNaoVerificado(verificado, naoVerificado), true);
  assert.equal(emailNaoVerificado(undefined, naoVerificado), true);
  assert.equal(emailNaoVerificado(verificado), false);
  // Sem a claim (ou sem token) não bloqueia: quem decide é o Keycloak.
  assert.equal(emailNaoVerificado(jwt({ sub: 'u1' })), false);
  assert.equal(emailNaoVerificado(undefined, null), false);
});

test('HU-001: fechar o navegador no cadastro leva à confirmação; no login, só cancela', () => {
  assert.equal(desfechoSemCodigo('criar-conta'), 'confirmar-email');
  assert.equal(desfechoSemCodigo('login'), 'cancelado');
});
