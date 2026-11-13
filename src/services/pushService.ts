import type { components } from '../types/contracts/notification-v1';
import { apiClient, type ApiClient } from './apiClient';

let Platform: { OS: string } = { OS: 'node' };
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rn = require('react-native');
  if (rn?.Platform) Platform = rn.Platform;
} catch {
  // Ambiente Node.js de testes
}

export type Plataforma = components['schemas']['Plataforma'];
export type TipoAlerta = components['schemas']['TipoAlerta'];
export type RegistrarTokenPushRequest = components['schemas']['RegistrarTokenPushRequest'];
export type TokenPush = components['schemas']['TokenPush'];

export const CANAL_SOS = 'sos';
export const CANAL_ALERTAS = 'alertas';

export const ROTA_PUSH_TOKENS = '/api/v1/notification/push-tokens';

export function rotaRemoverPushToken(identificadorAparelho: string): string {
  return `${ROTA_PUSH_TOKENS}/${encodeURIComponent(identificadorAparelho)}`;
}

export function rotaConfirmarLeitura(notificacaoId: string): string {
  return `/api/v1/notification/notificacoes/${encodeURIComponent(notificacaoId)}/leitura`;
}

export interface OpcoesPush {
  cliente?: Pick<ApiClient, 'put' | 'post' | 'delete'>;
}

export interface DestinoNotificacao {
  tela: 'SosReceived' | 'Alerts';
  notificacaoId?: string;
  alarmeId?: string;
  idosoId?: string;
}

let Notifications: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('expo-notifications');
  if (mod) {
    Notifications = mod.getPermissionsAsync ? mod : mod.default;
  }
} catch (err) {
  console.warn('[pushService] expo-notifications indisponível:', err instanceof Error ? err.message : 'erro desconhecido');
}

/**
 * RN-017: SOS e alertas Críticos usam o canal prioritário (`sos`);
 * Atenção e Técnicos usam o canal normal (`alertas`).
 */
export function canalParaTipoAlerta(tipo?: TipoAlerta | string | null): string {
  const upper = typeof tipo === 'string' ? tipo.toUpperCase() : '';
  if (upper === 'SOS' || upper === 'CRITICO') {
    return CANAL_SOS;
  }
  return CANAL_ALERTAS;
}

export async function configurarCanaisPush(notif: any = Notifications): Promise<void> {
  if (
    Platform.OS !== 'android' ||
    !notif ||
    typeof notif.setNotificationChannelAsync !== 'function'
  ) {
    return;
  }

  await notif.setNotificationChannelAsync(CANAL_SOS, {
    name: 'Emergências SOS e Alertas Críticos',
    importance: notif.AndroidImportance?.MAX ?? 5,
    vibrationPattern: [0, 400, 200, 400],
    sound: 'default',
    bypassDnd: true,
    lockscreenVisibility: notif.AndroidNotificationVisibility?.PUBLIC ?? 1,
  });

  await notif.setNotificationChannelAsync(CANAL_ALERTAS, {
    name: 'Alertas de Atenção e Técnicos',
    importance: notif.AndroidImportance?.DEFAULT ?? 3,
    sound: 'default',
  });
}

export async function solicitarPermissaoPush(notif: any = Notifications): Promise<boolean> {
  if (!notif || typeof notif.getPermissionsAsync !== 'function') {
    return false;
  }
  try {
    const atual = await notif.getPermissionsAsync();
    if (atual?.status === 'granted') return true;
    if (typeof notif.requestPermissionsAsync === 'function') {
      const pedido = await notif.requestPermissionsAsync();
      return pedido?.status === 'granted';
    }
    return false;
  } catch (err) {
    console.warn('[pushService] Erro ao solicitar permissão de push:', err instanceof Error ? err.message : 'erro desconhecido');
    return false;
  }
}

/**
 * Registra ou atualiza o token de push do aparelho no notification-service.
 * RN-014: recurso vital (SOS/alertas) — nunca condicionado a assinatura/plano.
 */
export async function registrarTokenPush(
  dados: RegistrarTokenPushRequest,
  { cliente = apiClient }: OpcoesPush = {}
): Promise<TokenPush> {
  if (!dados.token || !dados.identificadorAparelho) {
    throw new Error('Token e identificador do aparelho são obrigatórios para registrar push.');
  }
  const corpo: RegistrarTokenPushRequest = {
    token: dados.token,
    identificadorAparelho: dados.identificadorAparelho,
    plataforma: dados.plataforma,
  };
  return cliente.put<TokenPush>(ROTA_PUSH_TOKENS, corpo);
}

/** Remove o token de push do aparelho ao sair da conta. */
export async function removerTokenPush(
  identificadorAparelho: string,
  { cliente = apiClient }: OpcoesPush = {}
): Promise<void> {
  if (!identificadorAparelho) return;
  await cliente.delete(rotaRemoverPushToken(identificadorAparelho));
}

/** Confirma leitura de uma notificação ao tocá-la. */
export async function confirmarLeituraNotificacao(
  notificacaoId: string,
  { cliente = apiClient }: OpcoesPush = {}
): Promise<void> {
  if (!notificacaoId) return;
  await cliente.post(rotaConfirmarLeitura(notificacaoId));
}

/** Decide qual tela abrir a partir dos dados extras de uma notificação push. */
export function resolverDestinoNotificacao(
  data?: Record<string, unknown> | null
): DestinoNotificacao | null {
  if (!data || typeof data !== 'object') return null;

  const tipo = typeof data.tipo === 'string' ? data.tipo.toUpperCase() : '';
  const alarmeId = typeof data.alarmeId === 'string' ? data.alarmeId : undefined;
  const idosoId = typeof data.idosoId === 'string' ? data.idosoId : undefined;
  const notificacaoId =
    typeof data.notificacaoId === 'string'
      ? data.notificacaoId
      : typeof data.id === 'string'
      ? data.id
      : undefined;

  if (tipo === 'SOS' || alarmeId) {
    return {
      tela: 'SosReceived',
      notificacaoId,
      alarmeId,
      idosoId,
    };
  }

  if (
    tipo === 'CRITICO' ||
    tipo === 'ATENCAO' ||
    tipo === 'TECNICO' ||
    data.tela === 'Alerts'
  ) {
    return {
      tela: 'Alerts',
      notificacaoId,
      idosoId,
    };
  }

  return null;
}

let identificadorAparelhoCache: string | null = null;

export function obterIdentificadorAparelho(): string {
  if (identificadorAparelhoCache) return identificadorAparelhoCache;
  identificadorAparelhoCache = `${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return identificadorAparelhoCache;
}

export async function inicializarPushUsuario(
  opcoes: OpcoesPush & { notif?: any; identificadorAparelho?: string } = {}
): Promise<boolean> {
  const notif = opcoes.notif ?? Notifications;
  const identificadorAparelho = opcoes.identificadorAparelho ?? obterIdentificadorAparelho();

  if (Platform.OS === 'web' || !notif) return false;

  await configurarCanaisPush(notif);
  const permitido = await solicitarPermissaoPush(notif);
  if (!permitido) return false;

  try {
    let token: string | null = null;
    if (typeof notif.getDevicePushTokenAsync === 'function') {
      const res = await notif.getDevicePushTokenAsync();
      token = typeof res?.data === 'string' ? res.data : null;
    } else if (typeof notif.getExpoPushTokenAsync === 'function') {
      const res = await notif.getExpoPushTokenAsync();
      token = typeof res?.data === 'string' ? res.data : null;
    }

    if (!token) return false;

    const plataforma: Plataforma = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
    await registrarTokenPush(
      { token, identificadorAparelho, plataforma },
      { cliente: opcoes.cliente }
    );
    return true;
  } catch (err) {
    console.warn('[pushService] Falha ao registrar token de push:', err instanceof Error ? err.message : 'erro desconhecido');
    return false;
  }
}

export function registrarOuvinteToqueNotificacao(
  aoTocar: (destino: DestinoNotificacao) => void,
  { cliente = apiClient, notif = Notifications }: OpcoesPush & { notif?: any } = {}
): () => void {
  if (!notif || typeof notif.addNotificationResponseReceivedListener !== 'function') {
    return () => {};
  }

  const subscription = notif.addNotificationResponseReceivedListener((response: any) => {
    const data = response?.notification?.request?.content?.data as Record<string, unknown> | undefined;
    const destino = resolverDestinoNotificacao(data);
    if (!destino) return;

    if (destino.notificacaoId) {
      confirmarLeituraNotificacao(destino.notificacaoId, { cliente }).catch((err) => {
        console.warn('[pushService] Erro ao confirmar leitura da notificação:', err instanceof Error ? err.message : 'erro desconhecido');
      });
    }
    aoTocar(destino);
  });

  return () => {
    if (subscription && typeof subscription.remove === 'function') {
      subscription.remove();
    }
  };
}
