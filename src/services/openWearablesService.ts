import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
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
  /** Uma rodada de envio está em andamento agora. */
  sincronizando: boolean;
  sessaoValida: boolean;
  simulado: boolean;
}

type OpenWearablesModulo = typeof import('open-wearables');
type OpenWearablesSdk = OpenWearablesModulo['default'];
let moduloPromise: Promise<OpenWearablesModulo> | null = null;

/** Nome do módulo nativo que o pacote open-wearables registra (requireNativeModule no próprio pacote). */
export const MODULO_NATIVO_OPEN_WEARABLES = 'OpenWearablesHealthSDK';

const MENSAGEM_SEM_MODULO = 'O módulo nativo do relógio (Open Wearables) não está disponível neste aparelho.';

/**
 * O módulo nativo do relógio existe neste app? Consulta sem avaliar o pacote open-wearables: avaliar o pacote
 * sem o módulo chama requireNativeModule, que lança, e o Metro reporta isso como erro fatal (tela vermelha)
 * antes de a promessa do import() rejeitar. Por isso nenhum import('open-wearables') acontece sem esta checagem.
 */
export function sdkNativoDisponivel(): boolean {
  if (ehExpoGo) return false;
  try {
    return requireOptionalNativeModule(MODULO_NATIVO_OPEN_WEARABLES) != null;
  } catch {
    return false;
  }
}

/**
 * Carrega o SDK nativo, só depois de confirmar que o módulo nativo existe (Expo Go ou build sem o plugin não
 * têm). Sem ele lança um erro claro e não guarda a promessa, para uma próxima tentativa carregar de novo.
 */
async function moduloSdk(): Promise<OpenWearablesModulo> {
  if (!sdkNativoDisponivel()) throw new Error(MENSAGEM_SEM_MODULO);
  if (!moduloPromise) {
    moduloPromise = import('open-wearables').then((mod) => {
      if (!mod?.default) throw new Error(MENSAGEM_SEM_MODULO);
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

/** Sem o módulo nativo (Expo Go ou build sem o plugin) não há sincronização a parar. */
export async function pararSincronizacaoOpenWearables(): Promise<void> {
  if (!sdkNativoDisponivel()) return;
  const OpenWearablesHealthSDK = await sdk();
  await OpenWearablesHealthSDK.stopBackgroundSync();
  await OpenWearablesHealthSDK.signOut();
}

/** null quando o relógio não pode ser consultado neste ambiente (Expo Go ou build sem o módulo nativo). */
export async function obterEstadoOpenWearables(): Promise<EstadoOpenWearables | null> {
  if (mockPermitido()) {
    return {
      healthConnectInstalado: true,
      permissoesConcedidas: true,
      segundoPlanoAtivo: true,
      sincronizando: false,
      sessaoValida: true,
      simulado: true,
    };
  }

  if (!sdkNativoDisponivel()) return null;

  const OpenWearablesHealthSDK = await sdk();
  const providers = Platform.OS === 'android' ? OpenWearablesHealthSDK.getAvailableProviders() : [];
  const credentials = OpenWearablesHealthSDK.getStoredCredentials();
  // getSyncStatus().createdAt é a data da sessão de envio em andamento e volta a null quando ela termina:
  // não serve como "última medição". Essa hora vem do servidor (coletadoEm de /hoje), lida pela tela.
  const status = OpenWearablesHealthSDK.getSyncStatus();
  return {
    healthConnectInstalado: Platform.OS !== 'android' || Boolean(providers.find((provider) => provider.id === 'google')?.isAvailable),
    permissoesConcedidas: OpenWearablesHealthSDK.isSessionValid() && credentials.provider === (Platform.OS === 'android' ? 'google' : 'apple'),
    segundoPlanoAtivo: OpenWearablesHealthSDK.isSyncActive(),
    sincronizando: status.isSyncing,
    sessaoValida: OpenWearablesHealthSDK.isSessionValid(),
    simulado: false,
  };
}

