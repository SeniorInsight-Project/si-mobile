import { mockPermitido } from '../config/ambiente';
import { apiClient, type ApiClient } from './apiClient';
import { tiposAutorizados, type Consentimentos } from './consentimentoService';

export const OPEN_WEARABLES_SDK_COMMIT = '339bd95f708fa3ef3682a98e70c106a0f82ec184';
export const INTERVALO_SINCRONIZACAO_MIN = 15;
export const DIAS_HISTORICO_INICIAL = 90;

const ROTA_TOKEN = (idosoId: string) => `/api/v1/telemetry/idosos/${idosoId}/open-wearables/sdk-token`;

export interface SdkTokenResponse {
  host: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export interface EstadoOpenWearables {
  healthConnectInstalado: boolean;
  permissoesConcedidas: boolean;
  segundoPlanoAtivo: boolean;
  ultimaSincronizacaoMs: number | null;
  sessaoValida: boolean;
  simulado: boolean;
}

type OpenWearablesSdk = typeof import('open-wearables').default;
let sdkPromise: Promise<OpenWearablesSdk> | null = null;

async function sdk(): Promise<OpenWearablesSdk> {
  if (!sdkPromise) {
    sdkPromise = import('open-wearables').then((mod) => mod.default);
  }
  return sdkPromise;
}

function tiposSdk(consentimentos: Consentimentos, HealthDataType: typeof import('open-wearables').HealthDataType) {
  return tiposAutorizados(consentimentos).flatMap((tipo) => {
    if (tipo === 'BATIMENTOS') return [HealthDataType.HeartRate];
    if (tipo === 'PASSOS') return [HealthDataType.Steps];
    if (tipo === 'SONO') return [HealthDataType.Sleep];
    return [HealthDataType.OxygenSaturation];
  });
}

export function rotaTokenSdk(idosoId: string): string {
  return ROTA_TOKEN(idosoId);
}

export async function obterTokenSdk(
  idosoId: string,
  { cliente = apiClient }: { cliente?: Pick<ApiClient, 'post'> } = {},
): Promise<SdkTokenResponse> {
  return cliente.post<SdkTokenResponse>(ROTA_TOKEN(idosoId));
}

export async function conectarOpenWearables(
  idosoId: string,
  consentimentos: Consentimentos,
  { cliente = apiClient }: { cliente?: Pick<ApiClient, 'post'> } = {},
): Promise<void> {
  const [OpenWearablesHealthSDK, token] = await Promise.all([sdk(), obterTokenSdk(idosoId, { cliente })]);
  const { Platform } = await import('react-native');
  OpenWearablesHealthSDK.configure(token.host);

  const { HealthDataType } = await import('open-wearables');
  await OpenWearablesHealthSDK.signIn(token.userId, token.accessToken, token.refreshToken, null);
  if (Platform.OS === 'android' && !OpenWearablesHealthSDK.setProvider('google')) {
    await OpenWearablesHealthSDK.signOut();
    throw new Error('Health Connect não está instalado.');
  }
  const tipos = tiposSdk(consentimentos, HealthDataType);
  if (tipos.length === 0 || !(await OpenWearablesHealthSDK.requestAuthorization(tipos))) {
    await OpenWearablesHealthSDK.signOut();
    throw new Error('Nenhuma permissão de saúde foi concedida.');
  }

  OpenWearablesHealthSDK.setSyncInterval(INTERVALO_SINCRONIZACAO_MIN);
  if (!(await OpenWearablesHealthSDK.startBackgroundSync(DIAS_HISTORICO_INICIAL))) {
    await OpenWearablesHealthSDK.signOut();
    throw new Error('Não foi possível iniciar a sincronização em segundo plano.');
  }
}

export async function pararSincronizacaoOpenWearables(): Promise<void> {
  const OpenWearablesHealthSDK = await sdk();
  await OpenWearablesHealthSDK.stopBackgroundSync();
  await OpenWearablesHealthSDK.signOut();
}

export async function obterEstadoOpenWearables(): Promise<EstadoOpenWearables> {
  if (mockPermitido()) {
    return {
      healthConnectInstalado: true,
      permissoesConcedidas: true,
      segundoPlanoAtivo: true,
      ultimaSincronizacaoMs: Date.now() - 12 * 60_000,
      sessaoValida: true,
      simulado: true,
    };
  }

  const OpenWearablesHealthSDK = await sdk();
  const { Platform } = await import('react-native');
  const providers = Platform.OS === 'android' ? OpenWearablesHealthSDK.getAvailableProviders() : [];
  const credentials = OpenWearablesHealthSDK.getStoredCredentials();
  const status = OpenWearablesHealthSDK.getSyncStatus();
  const ultima = status.createdAt ? Date.parse(status.createdAt) : NaN;
  return {
    healthConnectInstalado: Platform.OS !== 'android' || Boolean(providers.find((provider) => provider.id === 'google')?.isAvailable),
    permissoesConcedidas: OpenWearablesHealthSDK.isSessionValid() && credentials.provider === (Platform.OS === 'android' ? 'google' : 'apple'),
    segundoPlanoAtivo: OpenWearablesHealthSDK.isSyncActive(),
    ultimaSincronizacaoMs: Number.isFinite(ultima) ? ultima : null,
    sessaoValida: OpenWearablesHealthSDK.isSessionValid(),
    simulado: false,
  };
}

