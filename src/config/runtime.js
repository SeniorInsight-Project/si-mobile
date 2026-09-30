const env = process.env;

export const runtimeConfig = {
  apiBaseUrl: env.EXPO_PUBLIC_API_BASE_URL ?? 'https://seniorinsight-backend-br-73d00847a82b.herokuapp.com',
  google: {
    clientId: env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '',
    iosClientId: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
    androidClientId: env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  },
  postgres: {
    host: env.EXPO_PUBLIC_POSTGRES_HOST ?? 'localhost',
    port: Number(env.EXPO_PUBLIC_POSTGRES_PORT ?? '5432'),
    database: env.EXPO_PUBLIC_POSTGRES_DATABASE ?? 'senior_insight_health',
  },
};
