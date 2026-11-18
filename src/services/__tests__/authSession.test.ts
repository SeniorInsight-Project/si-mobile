import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  definirArmazenamentoAparelhoPareado,
  marcarAparelhoPareado,
} from '../aparelhoPareadoService';
import {
  TOKEN_STORAGE_KEYS,
  setSecureStoreAdapter,
  obterTokens,
  obterExpiracaoAccessToken,
} from '../tokenStorageService';
import {
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_SCOPES,
  MARGEM_RENOVACAO_MS,
  SessaoInvalidaError,
  aoEncerrarSessao,
  configurarSessao,
  desfechoErroOAuth,
  desfechoSemCodigo,
  ehCancelamentoOAuth,
  emailNaoVerificado,
  montarConfigAuthComHint,
  obterAccessTokenValido,
  papeisDoToken,
  renovarSessao,
  salvarSessao,
  sair,
  deveRevogarComClientMobile,
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
  definirArmazenamentoAparelhoPareado(store);
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

test('sair no aparelho pareado do idoso não revoga com o client si-mobile, só limpa a sessão local', async () => {
  const { provedor, chamadas } = criarProvedor(async () => ({ accessToken: 'x' }));
  configurarSessao({
    provedor,
    relogio: () => AGORA,
    limpadoresLocais: [
      async () => {
        limpezas += 1;
      },
    ],
    obterAparelhoPareado: async () => ({ sessaoAparelhoId: 'sessao-1' }),
  });
  await salvarSessao({ accessToken: 'a', refreshToken: 'refresh-do-pareamento', expiresIn: 300, issuedAt: AGORA / 1000 });

  await sair();

  assert.deepEqual(chamadas.revogar, [], 'não deve chamar a revogação (Unmatching clients)');
  assert.deepEqual(await obterTokens(), { accessToken: null, refreshToken: null });
  assert.equal(limpezas, 1);
});

test('deveRevogarComClientMobile: só revoga refresh token do client si-mobile', () => {
  assert.equal(deveRevogarComClientMobile({ refreshToken: jwt({ azp: 'si-mobile' }) }), true);
  assert.equal(deveRevogarComClientMobile({ refreshToken: 'opaco' }), true, 'sem azp legível segue o fluxo normal');
  assert.equal(deveRevogarComClientMobile({ refreshToken: jwt({ azp: 'identity-service' }) }), false);
  assert.equal(
    deveRevogarComClientMobile({ refreshToken: 'opaco', accessToken: jwt({ azp: 'identity-service' }) }),
    false,
    'usa o azp do access token quando o refresh não é JWT'
  );
  assert.equal(deveRevogarComClientMobile({ refreshToken: jwt({ azp: 'si-mobile' }), sessaoAparelhoId: 's-1' }), false);
  assert.equal(deveRevogarComClientMobile({ refreshToken: null }), false);
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

test('montarConfigAuthComHint preserva a configuração base e adiciona prompt=create', () => {
  const base = {
    clientId: KEYCLOAK_CLIENT_ID,
    scopes: KEYCLOAK_SCOPES,
    redirectUri: 'seniorinsight://auth',
    responseType: 'code',
    usePKCE: true,
    codeChallengeMethod: 'S256',
  };

  const configCadastro = montarConfigAuthComHint(base, { prompt: 'create' });

  assert.deepEqual(configCadastro, {
    ...base,
    extraParams: { prompt: 'create' },
  });
  assert.equal('extraParams' in base, false);
});

test('cancelamento no Google (access_denied) é tratado como cancelamento sem erro apenas com cancelamentoSilencioso', () => {
  assert.equal(ehCancelamentoOAuth({ error: 'access_denied' }), true);
  assert.equal(ehCancelamentoOAuth({ error: 'server_error' }), false);
  assert.equal(ehCancelamentoOAuth(undefined), false);

  // Google (cancelamentoSilencioso = true) com access_denied -> 'cancelado'
  assert.equal(desfechoErroOAuth({ error: 'access_denied' }, true), 'cancelado');
  // Google com outro erro ou sem params -> 'erro'
  assert.equal(desfechoErroOAuth({ error: 'server_error' }, true), 'erro');
  assert.equal(desfechoErroOAuth(undefined, true), 'erro');

  // Entrar (login) e Criar conta (criar-conta) sem cancelamentoSilencioso -> 'erro' mesmo com access_denied
  assert.equal(desfechoErroOAuth({ error: 'access_denied' }, false), 'erro');
  assert.equal(desfechoErroOAuth({ error: 'access_denied' }), 'erro');
});

test('provedorPadrao: aparelho pareado com sessaoAparelhoId renova pela rota do identity sem Authorization', async () => {
  const chamadasFetch: Array<{ url: string; init?: RequestInit }> = [];
  let oidcChamado = false;
  configurarSessao({
    relogio: () => AGORA,
    limpadoresLocais: [
      async () => {
        limpezas += 1;
      },
    ],
    fetch: (async (url: string | URL | Request, init?: RequestInit) => {
      chamadasFetch.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          accessToken: 'access-idoso-novo',
          refreshToken: 'refresh-idoso-novo',
          expiresIn: 300,
          tokenType: 'Bearer',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch,
    refreshOidc: async () => {
      oidcChamado = true;
      return { accessToken: 'nao-deve-usar' };
    },
  });

  await marcarAparelhoPareado({
    perfilId: 'perfil-1',
    nome: 'Maria',
    sessaoAparelhoId: 'sessao-idoso-42',
  });
  await salvarSessao({
    accessToken: 'access-velho',
    refreshToken: 'refresh-idoso-atual',
    expiresIn: 30,
    issuedAt: AGORA / 1000,
  });

  const novoToken = await renovarSessao();

  assert.equal(novoToken, 'access-idoso-novo');
  assert.equal(oidcChamado, false);
  assert.equal(chamadasFetch.length, 1);
  const req = chamadasFetch[0];
  assert.ok(req.url.endsWith('/api/v1/identity/pareamentos/sessoes/sessao-idoso-42/renovacoes'));
  assert.equal(req.init?.method, 'POST');
  const headers = new Headers(req.init?.headers);
  assert.equal(headers.has('Authorization'), false);
  assert.equal(headers.get('Content-Type'), 'application/json');
  assert.deepEqual(JSON.parse(String(req.init?.body)), { refreshToken: 'refresh-idoso-atual' });
  assert.deepEqual(await obterTokens(), {
    accessToken: 'access-idoso-novo',
    refreshToken: 'refresh-idoso-novo',
  });
  assert.equal(await obterExpiracaoAccessToken(), AGORA + 300_000);
});

test('provedorPadrao: aparelho pareado sem sessaoAparelhoId e familiar seguem pelo refresh OIDC', async () => {
  const chamadasFetch: string[] = [];
  const chamadasOidc: string[] = [];
  configurarSessao({
    relogio: () => AGORA,
    limpadoresLocais: [],
    fetch: (async (url: string | URL | Request) => {
      chamadasFetch.push(String(url));
      throw new Error('fetch não deve ser chamado');
    }) as typeof fetch,
    refreshOidc: async (refreshToken) => {
      chamadasOidc.push(refreshToken);
      return { accessToken: `oidc-${refreshToken}`, refreshToken: 'r-novo', expiresIn: 300, issuedAt: AGORA / 1000 };
    },
  });

  // Familiar (sem aparelho pareado)
  await salvarSessao({ accessToken: 'a1', refreshToken: 'r-fam', expiresIn: 300, issuedAt: AGORA / 1000 });
  assert.equal(await renovarSessao(), 'oidc-r-fam');

  // Pareado antigo (sem sessaoAparelhoId)
  await marcarAparelhoPareado({ perfilId: 'perfil-1', nome: 'Maria' });
  await salvarSessao({ accessToken: 'a2', refreshToken: 'r-antigo', expiresIn: 300, issuedAt: AGORA / 1000 });
  assert.equal(await renovarSessao(), 'oidc-r-antigo');

  assert.deepEqual(chamadasOidc, ['r-fam', 'r-antigo']);
  assert.equal(chamadasFetch.length, 0);
});

test('provedorPadrao: 400, 401 e 404 na rota de renovação encerram a sessão local', async () => {
  for (const status of [400, 401, 404]) {
    store = criarMockSecureStore();
    setSecureStoreAdapter(store);
    definirArmazenamentoAparelhoPareado(store);
    limpezas = 0;

    configurarSessao({
      relogio: () => AGORA,
      limpadoresLocais: [
        async () => {
          limpezas += 1;
        },
      ],
      fetch: (async () => new Response(JSON.stringify({ mensagem: 'inválido' }), { status })) as typeof fetch,
    });

    await marcarAparelhoPareado({ perfilId: 'p1', nome: 'Maria', sessaoAparelhoId: 'sessao-1' });
    await salvarSessao({ accessToken: 'a', refreshToken: 'r-secreto', expiresIn: 300, issuedAt: AGORA / 1000 });
    const motivos: string[] = [];
    const remover = aoEncerrarSessao((m) => motivos.push(m));

    try {
      await assert.rejects(renovarSessao(), (err: unknown) => err instanceof SessaoInvalidaError);
      assert.deepEqual(await obterTokens(), { accessToken: null, refreshToken: null });
      assert.equal(limpezas, 1);
      assert.deepEqual(motivos, ['expirada']);
    } finally {
      remover();
    }
  }
});

test('provedorPadrao: 429, 503 e falha de rede mantêm a sessão e não vazam tokens em logs', async () => {
  const avisos: string[] = [];
  const warnOriginal = console.warn;
  console.warn = (...args: unknown[]) => {
    avisos.push(args.map(String).join(' '));
  };

  try {
    const cenarios: Array<() => Promise<Response>> = [
      async () => new Response('too many', { status: 429 }),
      async () => new Response('unavailable', { status: 503 }),
      async () => {
        throw new TypeError('Network request failed');
      },
    ];

    for (const simular of cenarios) {
      store = criarMockSecureStore();
      setSecureStoreAdapter(store);
      definirArmazenamentoAparelhoPareado(store);
      limpezas = 0;

      configurarSessao({
        relogio: () => AGORA,
        limpadoresLocais: [
          async () => {
            limpezas += 1;
          },
        ],
        fetch: simular as typeof fetch,
      });

      await marcarAparelhoPareado({ perfilId: 'p1', nome: 'Maria', sessaoAparelhoId: 'sessao-1' });
      await salvarSessao({
        accessToken: 'access-secreto-123',
        refreshToken: 'refresh-secreto-456',
        expiresIn: 10,
        issuedAt: AGORA / 1000,
      });

      const motivos: string[] = [];
      const remover = aoEncerrarSessao((m) => motivos.push(m));
      try {
        assert.equal(await obterAccessTokenValido(), 'access-secreto-123');
        assert.equal((await obterTokens()).refreshToken, 'refresh-secreto-456');
        assert.equal(limpezas, 0);
        assert.deepEqual(motivos, []);
      } finally {
        remover();
      }
    }

    const textoLogs = avisos.join('\n');
    assert.equal(textoLogs.includes('access-secreto-123'), false);
    assert.equal(textoLogs.includes('refresh-secreto-456'), false);
  } finally {
    console.warn = warnOriginal;
  }
});
