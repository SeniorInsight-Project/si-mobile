/**
 * Login (HU-002) e criação de conta (HU-001) pelo Keycloak com Authorization Code + PKCE (S256)
 * no client público si-mobile. Formulários de login e cadastro, redefinição de senha (HU-004),
 * MFA e a verificação de e-mail são telas do tema do Keycloak; o app não recebe senha.
 */
import { useCallback, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
  AuthRequest,
  AuthRequestConfig,
  AuthSessionResult,
  CodeChallengeMethod,
  DiscoveryDocument,
  ResponseType,
  TokenTypeHint,
  exchangeCodeAsync,
  makeRedirectUri,
  revokeAsync,
  useAuthRequest,
  useAutoDiscovery,
} from 'expo-auth-session';
import { runtimeConfig } from '../config/runtime';
import {
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_SCOPES,
  desfechoErroOAuth,
  desfechoSemCodigo,
  emailNaoVerificado,
  montarConfigAuthComHint,
  salvarSessao,
  urlRedefinicaoSenha,
  type DesfechoAutenticacao,
  type FluxoAutenticacao,
} from './authSession';

export { KEYCLOAK_SCOPES, sair, aoEncerrarSessao, obterAccessTokenValido } from './authSession';
export type { DesfechoAutenticacao } from './authSession';

// Fecha a janela do navegador ao voltar do Keycloak (necessário no web).
WebBrowser.maybeCompleteAuthSession();

/**
 * seniorinsight://auth no development build / app instalado.
 * No Expo Go o Expo devolve exp://<host>:<porta>/--/auth (ver README).
 * Não passe `scheme` aqui: no SDK 58 ele força seniorinsight:// também no Expo Go,
 * que não trata esse scheme, e o login nunca volta para o app.
 */
export const redirectUri = makeRedirectUri({ native: 'seniorinsight://auth', path: 'auth' });

const CONFIG_BASE: AuthRequestConfig = {
  clientId: KEYCLOAK_CLIENT_ID,
  scopes: KEYCLOAK_SCOPES,
  redirectUri,
  responseType: ResponseType.Code,
  usePKCE: true,
  codeChallengeMethod: CodeChallengeMethod.S256,
};

// prompt=create abre direto a tela de cadastro do realm (registrationAllowed).
const CONFIG_CRIAR_CONTA: AuthRequestConfig = montarConfigAuthComHint(CONFIG_BASE, { prompt: 'create' });

// kc_idp_hint=google abre direto a escolha de conta do Google, sem mostrar a tela do Keycloak.
const CONFIG_GOOGLE: AuthRequestConfig = montarConfigAuthComHint(CONFIG_BASE, { kc_idp_hint: 'google' });

function mensagemDeErro(params: Record<string, string> | undefined, erro?: Error | null): string {
  if (params?.error_description) return params.error_description;
  if (erro?.message) return erro.message;
  return 'Não foi possível entrar. Tente novamente.';
}

export interface AutenticacaoKeycloak {
  /** Discovery carregada e requisições PKCE prontas. */
  pronto: boolean;
  carregando: boolean;
  erro: string | null;
  /** Abre o login do Keycloak. */
  entrar: () => Promise<DesfechoAutenticacao>;
  /** Abre direto a escolha de conta do Google (kc_idp_hint=google). */
  entrarComGoogle: () => Promise<DesfechoAutenticacao>;
  /** Abre o cadastro do Keycloak (prompt=create). */
  criarConta: () => Promise<DesfechoAutenticacao>;
}

export function useAutenticacaoKeycloak(): AutenticacaoKeycloak {
  const discovery = useAutoDiscovery(runtimeConfig.keycloakIssuer);
  const [requestLogin, , promptLogin] = useAuthRequest(CONFIG_BASE, discovery);
  const [requestGoogle, , promptGoogle] = useAuthRequest(CONFIG_GOOGLE, discovery);
  const [requestCadastro, , promptCadastro] = useAuthRequest(CONFIG_CRIAR_CONTA, discovery);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const autenticar = useCallback(
    async (
      fluxo: FluxoAutenticacao,
      request: AuthRequest | null,
      prompt: () => Promise<AuthSessionResult>,
      cancelamentoSilencioso = false,
    ): Promise<DesfechoAutenticacao> => {
      if (!request || !discovery) return 'cancelado';
      setErro(null);
      setCarregando(true);
      try {
        const resultado = await prompt();
        if (resultado.type === 'error') {
          const desfecho = desfechoErroOAuth(resultado.params, cancelamentoSilencioso);
          if (desfecho === 'cancelado') {
            return 'cancelado';
          }
          setErro(mensagemDeErro(resultado.params, resultado.error));
          return 'erro';
        }
        if (resultado.type !== 'success') {
          return desfechoSemCodigo(fluxo);
        }

        const tokens = await exchangeCodeAsync(
          {
            clientId: KEYCLOAK_CLIENT_ID,
            code: resultado.params.code,
            redirectUri,
            extraParams: { code_verifier: request.codeVerifier ?? '' },
          },
          discovery,
        );

        if (emailNaoVerificado(tokens.idToken, tokens.accessToken)) {
          // Sem e-mail confirmado não guardamos sessão: o login é refeito depois da confirmação.
          await revogarSemFalhar(tokens.refreshToken, discovery);
          return 'confirmar-email';
        }

        await salvarSessao({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          issuedAt: tokens.issuedAt,
        });
        return 'sessao';
      } catch (err) {
        setErro(mensagemDeErro(undefined, err as Error));
        return 'erro';
      } finally {
        setCarregando(false);
      }
    },
    [discovery],
  );

  const entrar = useCallback(
    () => autenticar('login', requestLogin, () => promptLogin()),
    [autenticar, requestLogin, promptLogin],
  );
  const entrarComGoogle = useCallback(
    () => autenticar('login', requestGoogle, () => promptGoogle(), true),
    [autenticar, requestGoogle, promptGoogle],
  );
  const criarConta = useCallback(
    () => autenticar('criar-conta', requestCadastro, () => promptCadastro()),
    [autenticar, requestCadastro, promptCadastro],
  );

  return {
    pronto: Boolean(requestLogin && requestGoogle && requestCadastro && discovery),
    carregando,
    erro,
    entrar,
    entrarComGoogle,
    criarConta,
  };
}

async function revogarSemFalhar(refreshToken: string | undefined, discovery: DiscoveryDocument): Promise<void> {
  if (!refreshToken) return;
  try {
    await revokeAsync(
      { clientId: KEYCLOAK_CLIENT_ID, token: refreshToken, tokenTypeHint: TokenTypeHint.RefreshToken },
      discovery,
    );
  } catch (err) {
    console.warn('[authService] Falha ao revogar o refresh token:', (err as Error)?.message);
  }
}

/** "Esqueci minha senha": fluxo de redefinição do próprio Keycloak (HU-004). */
export async function abrirRedefinicaoSenha(): Promise<void> {
  await WebBrowser.openBrowserAsync(urlRedefinicaoSenha());
}
