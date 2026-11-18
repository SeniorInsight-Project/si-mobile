import { apiClient, type ApiClient } from './apiClient';
import { lerNivelBateria } from './bateriaService';

/**
 * Status do celular do idoso para a família (auditoria 2, item 3b): bateria, modelo, sistema e versão do app.
 *
 * Rota: POST /api/v1/telemetry/aparelhos/status (gateway → telemetry /v1/aparelhos/status, 204). Só o aparelho
 * do idoso envia, ao abrir o app, ao voltar ao primeiro plano e a cada 15 min com o app aberto. Em segundo
 * plano não envia (isso depende de development build).
 */
export const ROTA_STATUS_CELULAR = '/api/v1/telemetry/aparelhos/status';
export const INTERVALO_STATUS_CELULAR_MS = 15 * 60 * 1000;

export interface StatusCelularRequest {
  idosoId: string;
  sincronizadoEm: string;
  nivelBateria?: number;
  modeloCelular?: string;
  sistemaOperacional?: string;
  versaoApp?: string;
}

export interface DadosAparelho {
  fabricante?: string | null;
  modelo?: string | null;
  sistema?: string | null;
  versaoSistema?: string | null;
}

function texto(valor: string | null | undefined, max: number): string | undefined {
  const limpo = valor?.trim();
  return limpo ? limpo.slice(0, max) : undefined;
}

/** "samsung SM-A515F" (sem repetir o fabricante se o modelo já o traz) e "Android 14". */
export function montarStatusCelular(
  idosoId: string,
  { nivelBateria, aparelho, versaoApp, agora = new Date() }: {
    nivelBateria: number | null;
    aparelho: DadosAparelho;
    versaoApp?: string | null;
    agora?: Date;
  }
): StatusCelularRequest {
  const fabricante = aparelho.fabricante?.trim() ?? '';
  const modelo = aparelho.modelo?.trim() ?? '';
  const modeloCompleto =
    fabricante && !modelo.toLowerCase().startsWith(fabricante.toLowerCase()) ? `${fabricante} ${modelo}` : modelo;
  const sistema = [aparelho.sistema, aparelho.versaoSistema].filter((p) => p?.trim()).join(' ');

  const corpo: StatusCelularRequest = { idosoId, sincronizadoEm: agora.toISOString() };
  if (typeof nivelBateria === 'number') corpo.nivelBateria = nivelBateria;
  const m = texto(modeloCompleto, 100);
  if (m) corpo.modeloCelular = m;
  const s = texto(sistema, 100);
  if (s) corpo.sistemaOperacional = s;
  const v = texto(versaoApp, 50);
  if (v) corpo.versaoApp = v;
  return corpo;
}

function lerAparelho(): DadosAparelho {
  try {
    const Device = require('expo-device');
    return {
      fabricante: Device.manufacturer,
      modelo: Device.modelName,
      sistema: Device.osName,
      versaoSistema: Device.osVersion,
    };
  } catch {
    return {};
  }
}

function lerVersaoApp(): string | null {
  try {
    const Constants = require('expo-constants').default;
    return Constants?.expoConfig?.version ?? null;
  } catch {
    return null;
  }
}

/** Lê o celular e envia o status. Não lança: falha vira WARN com o status HTTP. */
export async function enviarStatusCelular(
  idosoId: string,
  {
    cliente = apiClient,
    coletar = async () => ({ nivelBateria: await lerNivelBateria(), aparelho: lerAparelho(), versaoApp: lerVersaoApp() }),
  }: {
    cliente?: Pick<ApiClient, 'post'>;
    coletar?: () => Promise<{ nivelBateria: number | null; aparelho: DadosAparelho; versaoApp?: string | null }>;
  } = {}
): Promise<boolean> {
  try {
    await cliente.post(ROTA_STATUS_CELULAR, montarStatusCelular(idosoId, await coletar()));
    return true;
  } catch (erro: any) {
    console.warn(`[statusCelularIdoso] Falha ao enviar o status do celular (HTTP ${erro?.status ?? '?'}):`, erro?.message);
    return false;
  }
}

export interface FonteEstadoApp {
  currentState?: string | null;
  addEventListener(
    tipo: 'change',
    ouvinte: (estado: string) => void
  ): { remove(): void };
}

/**
 * Envia agora, a cada volta ao primeiro plano e a cada 15 min enquanto o app está aberto. Devolve a função que
 * para tudo (logout, troca de sessão).
 */
export function iniciarEnvioStatusCelular(
  idosoId: string,
  {
    enviar = (id: string) => enviarStatusCelular(id),
    estadoApp = require('react-native').AppState as FonteEstadoApp,
    intervaloMs = INTERVALO_STATUS_CELULAR_MS,
  }: {
    enviar?: (id: string) => Promise<unknown>;
    estadoApp?: FonteEstadoApp;
    intervaloMs?: number;
  } = {}
): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;

  const pararTimer = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  const emPrimeiroPlano = () => {
    enviar(idosoId);
    pararTimer();
    timer = setInterval(() => enviar(idosoId), intervaloMs);
  };

  if (!estadoApp.currentState || estadoApp.currentState === 'active') emPrimeiroPlano();

  let anterior = estadoApp.currentState ?? 'active';
  const inscricao = estadoApp.addEventListener('change', (estado) => {
    if (estado === 'active' && anterior !== 'active') emPrimeiroPlano();
    else if (estado !== 'active') pararTimer();
    anterior = estado;
  });

  return () => {
    pararTimer();
    inscricao.remove();
  };
}
