# Senior Insight - Mobile App

Initial React Native setup using Expo Go for Android.

## Stack configured

- React Native + Expo
- Local database with `expo-sqlite`
- Environment-based configuration for the si-api-gateway

## Getting started

1. Install dependencies:
   - `npm install`
2. Copy environment template:
   - `cp .env.example .env`
3. Start Expo:
   - `npm run android`

## Variáveis de ambiente

O app só fala com o `si-api-gateway`; não há URL padrão. Se alguma variável abaixo faltar, o app lança um erro ao carregar. Copie `.env.example` para `.env` e reinicie o Expo com `npx expo start -c` depois de alterar.

- `EXPO_PUBLIC_API_BASE_URL`: host do gateway, **sem** `/api` (os services já montam `/api/v1/...`). Ex.: `http://192.168.0.10:8080` no Docker Compose local (use o IP da máquina na rede, o celular não enxerga `localhost`) ou `https://<host-da-vm>` na VM da Azure.
- `EXPO_PUBLIC_KEYCLOAK_ISSUER`: issuer do realm no Keycloak, que roda sob `/auth`. Ex.: `https://<host-da-vm>/auth/realms/seniorinsight`.
