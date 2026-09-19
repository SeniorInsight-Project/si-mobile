# Senior Insight - Mobile App

Initial React Native setup using Expo Go for Android.

## Stack configured

- React Native + Expo
- Local database with `expo-sqlite`
- Environment-based configuration for Java backend connection
- PostgreSQL connection metadata configured via environment variables

## Getting started

1. Install dependencies:
   - `npm install`
2. Copy environment template:
   - `cp .env.example .env`
3. Start Expo:
   - `npm run android`

## Environment variables

- `EXPO_PUBLIC_API_BASE_URL`: Java backend base URL
- `EXPO_PUBLIC_POSTGRES_HOST`: PostgreSQL host metadata
- `EXPO_PUBLIC_POSTGRES_PORT`: PostgreSQL port metadata
- `EXPO_PUBLIC_POSTGRES_DATABASE`: PostgreSQL database metadata
