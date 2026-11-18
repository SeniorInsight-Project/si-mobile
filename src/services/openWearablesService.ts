import { Platform } from 'react-native';
import { mockPermitido } from '../config/ambiente';
import { ehExpoGo } from '../config/expoGo';
import { apiClient, type ApiClient } from './apiClient';
import { tiposAutorizados, type Consentimentos } from './consentimentoService';
import { rotaTokenSdk } from './openWearablesRotas';

export { rotaTokenSdk };

export const OPEN_WEARABLES_SDK_COMMIT = '339bd95f708fa3ef3682a98e70c106a0f82ec184';
export const INTERVALO_SINCRONIZACAO_MIN = 15;
export const DIAS_HISTORICO_INICIAL = 90;

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

type OpenWearablesModulo = typeof import('open-wearables');
type OpenWearablesSdk = OpenWearablesModulo['default'];
let moduloPromise: Promise<OpenWearablesModulo> | null = null;

/**
 * Carrega o SDK nativo. Sem o módulo nativo (ex.: build sem o plugin), o import devolve `default` indefinido:
 * nesse caso lança um erro claro e não guarda a promessa, para uma próxima tentativa carregar de novo.
 */
async function moduloSdk(): Promise<OpenWearablesModulo> {
  if (!moduloPromise) {
    moduloPromise = import('open-wearables').then((mod) => {
      if (!mod?.default) {
        throw new Error('O módulo nativo do relógio (Open Wearables) não está disponível neste aparelho.');
      }
      return mod;
    });
    moduloPromise.catch(() => {
      moduloPromise = null;
    });
  }
  return moduloPromise;
}

async function sdk(): Promise<OpenWearablesSdk> {
  return (await moduloSdk()).default;
}

function tiposSdk(consentimentos: Consentimentos, HealthDataType: typeof import('open-wearables').HealthDataType) {
  return tiposAutorizados(consentimentos).flatMap((tipo) => {
    if (tipo === 'BATIMENTOS') return [HealthDataType.HeartRate];
    if (tipo === 'PASSOS') return [HealthDataType.Steps];
    if (tipo === 'SONO') return [HealthDataType.Sleep];
    return [HealthDataType.OxygenSaturation];
  });
}

export async function obterTokenSdk(
  idosoId: string,
  { cliente = apiClient }: { cliente?: Pick<ApiClient, 'post'> } = {},
): Promise<SdkTokenResponse> {
  return cliente.post<SdkTokenResponse>(rotaTokenSdk(idosoId));
}

export async function conectarOpenWearables(
  idosoId: string,
  consentimentos: Consentimentos,
  { cliente = apiClient }: { cliente?: Pick<ApiClient, 'post'> } = {},
): Promise<void> {
  if (ehExpoGo) return;
  const [modulo, token] = await Promise.all([moduloSdk(), obterTokenSdk(idosoId, { cliente })]);
  const { default: OpenWearablesHealthSDK, HealthDataType } = modulo;
  OpenWearablesHealthSDK.configure(token.host);

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

/** No Expo Go não há SDK nativo nem sincronização a parar. */
export async function pararSincronizacaoOpenWearables(): Promise<void> {
  if (ehExpoGo) return;
  const OpenWearablesHealthSDK = await sdk();
  await OpenWearablesHealthSDK.stopBackgroundSync();
  await OpenWearablesHealthSDK.signOut();
}

/** null quando o relógio não pode ser consultado neste ambiente (Expo Go). */
export async function obterEstadoOpenWearables(): Promise<EstadoOpenWearables | null> {
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

  if (ehExpoGo) return null;

  const OpenWearablesHealthSDK = await sdk();
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

