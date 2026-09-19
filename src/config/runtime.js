const env = process.env;

export const runtimeConfig = {
  apiBaseUrl: env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080',
  postgres: {
    host: env.EXPO_PUBLIC_POSTGRES_HOST ?? 'localhost',
    port: Number(env.EXPO_PUBLIC_POSTGRES_PORT ?? '5432'),
    database: env.EXPO_PUBLIC_POSTGRES_DATABASE ?? 'senior_insight_health',
  },
};
