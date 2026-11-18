# Onboarding do si-mobile

Guia para quem vai rodar e alterar o app pela primeira vez. Os segredos (o `.env` real e, quando houver, `google-services.json` e keystore) **não** ficam no Git: você recebe um pacote pelo Vaultwarden.

## Pré-requisitos

- **Node.js 24** (o projeto roda com `v24.x`) e npm.
- **Java 17** (OpenJDK 17).
- **Android SDK** (Android Studio ou só o command-line tools), com `ANDROID_HOME` definido e `platform-tools` no `PATH` (para o `adb`).
- **Git**.
- Um celular Android com depuração USB ou um emulador. O Health Connect exige Android 9+ (o app usa `minSdkVersion` 29).

```bash
git clone https://github.com/SeniorInsight-Project/si-mobile.git
cd si-mobile
npm install
```

## Onde colocar cada arquivo do pacote de secrets

| Arquivo do pacote | Destino no projeto | Precisa para |
| --- | --- | --- |
| `si-mobile.env` | `.env` na raiz do projeto (renomeie) | Rodar o app (obrigatório) |
| `google-services.json` (se vier) | raiz do projeto | Push com FCM no app instalado |
| keystore de release e a senha (se vierem) | **não use** | Só o mantenedor gera o release |

O `.env` e esses arquivos já estão no `.gitignore`; nunca faça commit deles. Para ver o que cada variável faz, consulte o `.env.example` e a seção "Variáveis de ambiente" do [README](../README.md).

Depois de mudar o `.env`, reinicie o Metro limpando o cache: `npx expo start -c`.

## Rodar no Expo Go (mais rápido, com limitações)

```bash
npx expo start
```

Abra o QR code no Expo Go. Limitações:

- **Health Connect / Open Wearables não funciona**: é um módulo nativo e não existe no Expo Go. O app detecta isso e desliga a integração do relógio.
- **Push remoto não funciona**: o registro do token de push vira no-op no Expo Go.
- **Login contra a VM da Azure não funciona**: lá o Keycloak aceita só o redirect `seniorinsight://auth`, e o Expo Go usa `exp://...`. No Expo Go, só o ambiente local do `si-infra` aceita o login (ver README, "Testar contra o Docker Compose local").

Use o Expo Go para telas e fluxos que não dependem disso.

## Rodar com development build (recomendado)

O development build instala o app com o scheme `seniorinsight`, Health Connect e push.

### 1. Publicar o SDK do Open Wearables no Maven Local (uma vez por máquina)

O SDK nativo Android do Open Wearables não está no Maven Central; ele precisa estar no `~/.m2` da sua máquina. Depois do `npm install`, rode:

```bash
bash scripts/publicar-sdk-open-wearables.sh
```

O script lê a versão certa do pacote `open-wearables` e publica o SDK no Maven Local. Se preferir fazer à mão, siga a seção "Health Connect / Open Wearables" do README (`./gradlew publishToMavenLocal` no repositório `open_wearables_android_sdk`).

O `mavenLocal()` no `android/build.gradle` é colocado pelo config plugin `plugins/withMavenLocal.js` a cada `npx expo prebuild`, inclusive com `--clean`; não precisa editar o arquivo à mão. Se o build falhar com `Could not find com.openwearables.health:sdk`, o SDK não foi publicado no Maven Local.

### 2. Gerar e instalar

Com o celular conectado por USB (ou o emulador aberto):

```bash
npx expo run:android
```

O comando roda o `prebuild`, compila o app de debug, instala no aparelho e sobe o Metro. Nas próximas vezes, se você não mexeu em dependências nativas, basta `npx expo start --dev-client` com o app já instalado.

### Testes e lint

Antes de abrir PR:

```bash
npm test
npm run lint:estilo
```

## Como devolver as alterações

1. Atualize a `develop` e crie sua branch a partir dela:
   ```bash
   git checkout develop
   git pull
   git checkout -b <numero-da-issue>-descricao-curta
   ```
2. Faça commits pequenos e por assunto, em português.
3. Rode `npm test` e `npm run lint:estilo`.
4. Envie a branch e abra o PR **para a `develop`**, marcando `luandeferreira` como revisor:
   ```bash
   git push -u origin <sua-branch>
   gh pr create --base develop --reviewer luandeferreira
   ```
5. Não faça o merge: o revisor faz.

**Não** gere o APK de release, **não** troque nem crie keystore e **não** altere a configuração de assinatura. Isso é com o mantenedor (seção abaixo).

## Para o mantenedor

Passos para gerar o APK de release depois que o PR entrar na `develop`. **Não use o perfil `preview` do EAS**: o APK gerado por ele fechava ao abrir.

1. Na VM `debian-dev-vm`, atualize o código:
   ```bash
   cd ~/dev/projeto/seniorinsight/si-mobile   # ajuste para o caminho do clone na VM
   git checkout develop
   git pull
   npm install
   ```
2. Coloque os segredos (do Vaultwarden):
   - `.env` na raiz, com `EXPO_PUBLIC_API_BASE_URL` e `EXPO_PUBLIC_KEYCLOAK_ISSUER` da VM da Azure (`https://<host-da-vm>/auth/realms/seniorinsight`);
   - `google-services.json` na raiz, se o build usar FCM;
   - o keystore de release e a senha, se houver (ver o item 4).
3. Garanta o SDK do Open Wearables no Maven Local da VM (só na primeira vez ou depois de atualizar o pacote):
   ```bash
   bash scripts/publicar-sdk-open-wearables.sh
   ```
4. Gere o projeto nativo e o APK:
   ```bash
   npx expo prebuild
   cd android && ./gradlew assembleRelease
   ```
   O `prebuild` regenera o `android/`. Se você usa keystore de release próprio, reaplique a configuração de assinatura (`signingConfigs.release` no `android/app/build.gradle` e as senhas no `android/gradle.properties`) depois do `prebuild`. Sem isso, o template do Expo assina o release com o `debug.keystore`.
5. O APK fica em:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```
   Confira antes de distribuir: `ls -lh android/app/build/outputs/apk/release/` e instale num aparelho com `adb install -r android/app/build/outputs/apk/release/app-release.apk` para ver se abre e faz login.
