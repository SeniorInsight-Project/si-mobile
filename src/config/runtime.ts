// Configuração de runtime do app.
//
// O app só conversa com o si-api-gateway; nunca acessa banco diretamente.
// Não existe valor padrão: se uma variável obrigatória faltar, o carregamento
// falha com uma mensagem clara em vez de apontar silenciosamente para outro servidor.

export interface RuntimeConfig {
  /** Host do gateway, sem /api (os services montam /api/v1/...). */
  apiBaseUrl: string;
  /** Issuer do realm no Keycloak, ex.: https://<host>/auth/realms/seniorinsight */
  keycloakIssuer: string;
}

// As variáveis EXPO_PUBLIC_* precisam ser lidas por acesso estático
// (process.env.NOME) para o Expo conseguir embuti-las no bundle.
function required(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(
      `[config] Variável de ambiente ${name} não definida. ` +
        'Copie .env.example para .env, preencha os valores e reinicie o Expo (npx expo start -c).',
    );
  }
  return trimmed.replace(/\/+$/, '');
}

export const runtimeConfig: RuntimeConfig = {
  apiBaseUrl: required('EXPO_PUBLIC_API_BASE_URL', process.env.EXPO_PUBLIC_API_BASE_URL),
  keycloakIssuer: required('EXPO_PUBLIC_KEYCLOAK_ISSUER', process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER),
};
