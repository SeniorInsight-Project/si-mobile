const env = process.env;

export interface RuntimeConfig {
  apiBaseUrl: string;
  google: {
    clientId: string;
    iosClientId: string;
    androidClientId: string;
  };
}

export const runtimeConfig: RuntimeConfig = {
  apiBaseUrl:
    env.EXPO_PUBLIC_API_BASE_URL ??
    'https://seniorinsight-backend-br-73d00847a82b.herokuapp.com',
  google: {
    clientId: env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '',
    iosClientId: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
    androidClientId: env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  },
};
