# Senior Insight - Mobile App

Initial React Native setup using Expo Go for Android.

## Stack configured

- React Native + Expo
- Local database with `expo-sqlite`
- Environment-based configuration for the si-api-gateway
- Login pelo Keycloak (Authorization Code + PKCE) com `expo-auth-session`

## Getting started

1. Install dependencies:
   - `npm install`
2. Copy environment template:
   - `cp .env.example .env`
3. Start Expo:
   - `npm run android`

Testes: `npm test` (usa os valores fictícios de `.env.test`).

## Variáveis de ambiente

O app só fala com o `si-api-gateway`; não há URL padrão. Se alguma variável abaixo faltar, o app lança um erro ao carregar. Copie `.env.example` para `.env` e reinicie o Expo com `npx expo start -c` depois de alterar.

- `EXPO_PUBLIC_API_BASE_URL`: host do gateway, **sem** `/api` (os services já montam `/api/v1/...`). Ex.: `http://localhost:8080` no Docker Compose local (ver "Login" abaixo) ou `https://<host-da-vm>` na VM da Azure.
- `EXPO_PUBLIC_KEYCLOAK_ISSUER`: issuer do realm. Precisa ser **o mesmo** issuer que o gateway valida: `http://localhost:8180/realms/seniorinsight` no Docker Compose local e `https://<host-da-vm>/auth/realms/seniorinsight` na VM (lá o Keycloak roda sob `/auth`).

## Login (Keycloak)

O app não tem formulário de login próprio. "Entrar" abre o login do realm `seniorinsight` no navegador do sistema (client público `si-mobile`, PKCE `S256`, scopes `openid profile email offline_access`); e-mail, senha, "Esqueceu a senha?" e MFA são telas do tema do Keycloak.

- "Criar conta" (Entrada no App, Login e Aceitar Convite) abre o mesmo fluxo com `prompt=create`, que cai direto no cadastro do Keycloak. Com `verifyEmail` ligado no realm, quem acabou de se cadastrar fica na tela de verificação do Keycloak; ao fechar o navegador (ou se o token vier com `email_verified = false`) o app mostra "Confirme seu e-mail para continuar". "Já confirmei" refaz o login e, com o e-mail confirmado, o app segue o fluxo normal (`GET /api/v1/identity/me`, que cria o perfil no primeiro acesso, e a tela do papel).
- Tokens e expiração ficam só no `expo-secure-store`. O access token é renovado um minuto antes de vencer e, uma vez, quando o gateway responde 401. Se o refresh token for recusado, a sessão é limpa e o app volta ao Login.
- Ao abrir, com sessão salva, o app chama `GET /api/v1/identity/me` e abre a tela do papel do token: `idoso` → modo idoso, `familiar` → início; outros papéis veem um aviso de que o app é só para família e idoso.
- Sair revoga o refresh token no Keycloak e apaga o secure store e os bancos SQLite locais (fila do SOS e cache de medicamentos).
- Chamadas ao gateway devem passar por `src/services/apiClient.ts`, que põe o `Authorization: Bearer` e faz a renovação.

### Redirect URI

O redirect é montado com `makeRedirectUri({ scheme: 'seniorinsight', path: 'auth' })`, que muda conforme onde o app roda:

| Onde | Redirect | Aceito pelo realm |
| --- | --- | --- |
| Development build / app instalado | `seniorinsight://auth` | Sempre |
| Expo Go | `exp://<ip-do-computador>:8081/--/auth` | Só no Docker Compose do `si-infra` (`exp://*`) |
| Expo web | `http://localhost:8081/auth` | Só no Docker Compose do `si-infra` |

Na VM da Azure o client aceita só `seniorinsight://auth`: lá, teste com um development build.

### Testar contra o Docker Compose local

1. Suba o `si-infra` (`docker compose up -d`). Se o realm já existia no banco antes de os redirects do Expo Go serem adicionados, recrie-o (`docker compose down -v`), porque o Keycloak só importa o realm quando ele ainda não existe.
2. Use no `.env` os valores locais do `.env.example` (`localhost:8080` e `localhost:8180`). O Keycloak local emite tokens com issuer `http://localhost:8180/...`, então o app precisa chegar nele por `localhost`:
   - emulador Android ou celular Android por USB: `adb reverse tcp:8080 tcp:8080` e `adb reverse tcp:8180 tcp:8180`;
   - simulador iOS e Expo web: já enxergam o `localhost` do computador.

   Um celular só pelo Wi-Fi, sem USB, não alcança `localhost`; para isso o Keycloak e os serviços precisariam usar o IP da máquina como issuer.
3. Crie uma conta pela tela de cadastro do Keycloak (papel `familiar`) e confirme o e-mail no Mailpit (http://localhost:8025). Para testar o modo idoso, dê o papel `idoso` ao usuário no console (http://localhost:8180).

**Expo Go:** `npx expo start`, abra no Expo Go e toque em "Entrar". O Keycloak devolve para `exp://.../--/auth` e o Expo Go reabre o app.

**Development build:** `npx expo run:android` (ou `run:ios`) gera um app com o scheme `seniorinsight`; o redirect é `seniorinsight://auth`, igual ao de produção.

**Expo web:** `npx expo start --web` (porta 8081). O redirect volta para `http://localhost:8081/auth`.

## Development Build e EAS Build (EAS CLI)

O SDK do Open Wearables (Health Connect) e as notificações push do Expo com FCM não funcionam dentro do client genérico do Expo Go. Para desenvolvimento nativo, suporte a push em segundo plano (SOS - HU-065) e integração de saúde (HU-023), utilize o **Development Build**.

### Perfis configurados no `eas.json`

O arquivo `eas.json` possui três perfis pré-configurados:

1. **`development`**: Gera um APK de desenvolvimento (`developmentClient: true`) com suporte a depuração via Metro (`npx expo start --dev-client`).
2. **`preview`**: Gera um APK interno instalável para testes em aparelhos físicos de homologação.
3. **`production`**: Gera o pacote App Bundle (`.aab`) para publicação na Google Play Store.

### Gestão de Segredos e Credenciais

> [!IMPORTANT]
> Chaves de API, senhas, certificados ou tokens sensíveis **nunca** devem ser commitados no repositório nem inseridos em `eas.json` ou `app.json`. Utilize sempre os segredos de ambiente do EAS provisionados pela CLI (`eas secret:create`) ou configure credenciais sensíveis via painel do Expo (`eas credentials`).

### Como gerar um Development Build com EAS:

1. Instale a EAS CLI globalmente (caso ainda não possua):
   ```bash
   npm install -g eas-cli
   ```
2. Faça login na sua conta Expo / EAS:
   ```bash
   eas login
   ```
3. Vincule o projeto (se ainda não configurado):
   ```bash
   eas project:init
   ```
4. Gere o build de desenvolvimento para Android:
   ```bash
   eas build --profile development --platform android
   ```
5. Após o download e instalação do APK no aparelho ou emulador, inicie o servidor Metro em modo de desenvolvimento:
   ```bash
   npx expo start --dev-client
   ```

### Notificações Push e FCM (Android)

Para suporte a notificações push de emergência em produção:
- Configure as credenciais do Firebase Cloud Messaging (FCM V1) no painel do Expo EAS (`eas credentials`).
- O arquivo `google-services.json` pode ser inserido na raiz do `mobile-app/` e referenciado no `app.json` caso opte pelo build local via `npx expo run:android`.
