/**
 * Login pelo Keycloak (HU-002) com Authorization Code + PKCE (S256) no client público si-mobile.
 * O formulário de login, a redefinição de senha (HU-004) e o MFA são telas do tema do Keycloak.
 */
import { useCallback, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
  CodeChallengeMethod,
  ResponseType,
  exchangeCodeAsync,
  makeRedirectUri,
  useAuthRequest,
  useAutoDiscovery,
} from 'expo-auth-session';
import { runtimeConfig } from '../config/runtime';
import { KEYCLOAK_CLIENT_ID, salvarSessao, urlRedefinicaoSenha } from './authSession';

export { sair, aoEncerrarSessao, obterAccessTokenValido } from './authSession';

// Fecha a janela do navegador ao voltar do Keycloak (necessário no web).
WebBrowser.maybeCompleteAuthSession();

export const KEYCLOAK_SCOPES = ['openid', 'profile', 'email', 'offline_access'];

/**
 * seniorinsight://auth no development build / app instalado.
 * No Expo Go o Expo devolve exp://<host>:<porta>/--/auth (ver README).
 */
export const redirectUri = makeRedirectUri({ scheme: 'seniorinsight', path: 'auth' });

function mensagemDeErro(params: Record<string, string> | undefined, erro?: Error | null): string {
  if (params?.error_description) return params.error_description;
  if (erro?.message) return erro.message;
  return 'Não foi possível entrar. Tente novamente.';
}

export interface LoginKeycloak {
  /** Discovery carregada e requisição PKCE pronta. */
  pronto: boolean;
  carregando: boolean;
  erro: string | null;
  /** Abre o login do Keycloak; resolve true se a sessão foi salva. */
  entrar: () => Promise<boolean>;
}

export function useLoginKeycloak(): LoginKeycloak {
  const discovery = useAutoDiscovery(runtimeConfig.keycloakIssuer);
  const [request, , promptAsync] = useAuthRequest(
    {
      clientId: KEYCLOAK_CLIENT_ID,
      scopes: KEYCLOAK_SCOPES,
      redirectUri,
      responseType: ResponseType.Code,
      usePKCE: true,
      codeChallengeMethod: CodeChallengeMethod.S256,
    },
    discovery,
  );
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const entrar = useCallback(async (): Promise<boolean> => {
    if (!request || !discovery) return false;
    setErro(null);
    setCarregando(true);
    try {
      const resultado = await promptAsync();
      if (resultado.type !== 'success') {
        if (resultado.type === 'error') {
          setErro(mensagemDeErro(resultado.params, resultado.error));
        }
        return false;
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
      await salvarSessao({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        issuedAt: tokens.issuedAt,
      });
      return true;
    } catch (err) {
      setErro(mensagemDeErro(undefined, err as Error));
      return false;
    } finally {
      setCarregando(false);
    }
  }, [request, discovery, promptAsync]);

  return { pronto: Boolean(request && discovery), carregando, erro, entrar };
}

/** "Esqueci minha senha": fluxo de redefinição do próprio Keycloak (HU-004). */
export async function abrirRedefinicaoSenha(): Promise<void> {
  await WebBrowser.openBrowserAsync(urlRedefinicaoSenha());
}
