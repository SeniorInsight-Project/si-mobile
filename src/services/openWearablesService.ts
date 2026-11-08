import { apiClient, type ApiClient } from './apiClient';
import { type Consentimentos, tiposAutorizados } from './consentimentoService';
import { formatarHora } from './deviceStatusService';
import { salvarSyncRelogioLocal } from './relogioDatabase';
import { salvarTelemetriaLocal } from './telemetryDatabase';

/**
 * Serviço de Conexão e Sincronização Health Connect via Open Wearables (HU-023).
 * Rastreabilidade: RF-011, RF-016, RF-017, RF-018, RF-019, RF-020, RNF-006, RNF-010.
 */

export const PACOTE_HEALTH_CONNECT = 'com.google.android.apps.healthdata';
export const URL_PLAY_STORE_HEALTH_CONNECT = `https://play.google.com/store/apps/details?id=${PACOTE_HEALTH_CONNECT}`;
export const MARKET_URI_HEALTH_CONNECT = `market://details?id=${PACOTE_HEALTH_CONNECT}`;

export const MENSAGEM_HEALTH_CONNECT_AUSENTE =
  'O Health Connect não está instalado. Toque para instalar na Play Store e conectar seu relógio.';

export const INTERVALO_SINCRONIZACAO_MIN = 15;
export const LIMITE_SEM_DADOS_HORAS = 24;
export const VERSAO_APP_PADRAO = '1.0.0';

export type PermissaoHealthConnect =
  | 'androidx.health.permission.Steps'
  | 'androidx.health.permission.HeartRate'
  | 'androidx.health.permission.SleepSession'
  | 'androidx.health.permission.OxygenSaturation';

export interface LeituraTelemetriaItem {
  tipo: 'PASSOS' | 'BATIMENTOS' | 'SONO' | 'OXIGENACAO';
  valor: number;
  timestamp: string; // ISO 8601
  origem: string;
}

export interface MetadadosColetor {
  versaoApp: string;
  nivelBateriaCelular: number;
  horarioSincronizacao: string;
  provider: string;
}

export interface PayloadTelemetriaOpenWearables {
  idoso_id: string;
  device_id: string;
  device_model: string;
  provider: string;
  timestamp: string;
  battery_level?: number;
  heart_rate?: {
    bpm: number;
  };
  steps?: {
    count: number;
  };
  spo2_percentage?: number;
  metadata: {
    versao_app: string;
    bateria_celular: number;
    horario_sincronizacao: string;
    marcador_ultimo_sync?: string;
  };
}

export interface ConexaoRelogioInfo {
  healthConnectInstalado: boolean;
  permissoesConcedidas: boolean;
  leituraSegundoPlanoAtiva: boolean;
  ultimaMedicaoMs: number | null;
}

export interface AvaliacaoRelogioResultado {
  cenario: 1 | 2 | 3;
  titulo: string;
  mensagem: string;
  icone: string;
  cor: 'verde' | 'laranja' | 'cinza';
  acao: 'CONECTADO' | 'INSTALAR' | 'SINCRONIZAR_RELOGIO' | 'PERMISSOES';
}

/**
 * Mapeia permissões estritamente de acordo com os consentimentos que o idoso autorizou (RF-011 / HU-018).
 */
export function mapearPermissoesPorConsentimento(consent: Consentimentos): PermissaoHealthConnect[] {
  const permitidos = tiposAutorizados(consent);
  const lista: PermissaoHealthConnect[] = [];

  if (permitidos.includes('PASSOS')) {
    lista.push('androidx.health.permission.Steps');
  }
  if (permitidos.includes('BATIMENTOS')) {
    lista.push('androidx.health.permission.HeartRate');
  }
  if (permitidos.includes('SONO')) {
    lista.push('androidx.health.permission.SleepSession');
  }
  if (permitidos.includes('OXIGENACAO')) {
    lista.push('androidx.health.permission.OxygenSaturation');
  }

  return lista;
}

/**
 * Classifica a conexão do relógio nos 3 cenários clínicos da HU-023.
 */
export function avaliarConexaoRelogio(
  info: ConexaoRelogioInfo,
  agoraMs: number = Date.now()
): AvaliacaoRelogioResultado {
  // Cenário 2: Health Connect ausente
  if (!info.healthConnectInstalado) {
    return {
      cenario: 2,
      titulo: 'Health Connect não instalado',
      mensagem: MENSAGEM_HEALTH_CONNECT_AUSENTE,
      icone: 'download',
      cor: 'laranja',
      acao: 'INSTALAR',
    };
  }

  // Falta de permissões autorizadas
  if (!info.permissoesConcedidas) {
    return {
      cenario: 2,
      titulo: 'Permissões pendentes',
      mensagem: 'Conceda as permissões de saúde para permitir a leitura dos dados do relógio.',
      icone: 'watch',
      cor: 'laranja',
      acao: 'PERMISSOES',
    };
  }

  // Cenário 3: Sem dados recentes nas últimas 24 horas
  const limiteMs = LIMITE_SEM_DADOS_HORAS * 60 * 60 * 1000;
  if (info.ultimaMedicaoMs === null || agoraMs - info.ultimaMedicaoMs > limiteMs) {
    return {
      cenario: 3,
      titulo: 'Abra o app do seu relógio e sincronize',
      mensagem: 'Sem medição nas últimas 24 h. Abra o aplicativo do relógio para atualizar seus dados.',
      icone: 'sync_problem',
      cor: 'laranja',
      acao: 'SINCRONIZAR_RELOGIO',
    };
  }

  // Cenário 1: Sucesso com relógio conectado e dados recentes
  return {
    cenario: 1,
    titulo: 'Relógio conectado',
    mensagem: `Última medição às ${formatarHora(new Date(info.ultimaMedicaoMs))}`,
    icone: 'check_circle',
    cor: 'verde',
    acao: 'CONECTADO',
  };
}

/**
 * Calcula tempo de espera com backoff exponencial para reenvio de telemetria (RF-018).
 */
export function calcularEsperaExponencial(
  tentativa: number,
  baseMs = 1000,
  maxMs = 30000
): number {
  const tempo = baseMs * Math.pow(2, Math.max(0, tentativa - 1));
  return Math.min(tempo, maxMs);
}

/**
 * Gera chave única para descarte de duplicatas (RF-019).
 * Chave: idoso + tipo + horário + origem
 */
export function gerarChaveDeduplicacao(
  idosoId: string,
  tipo: string,
  horario: string,
  origem: string
): string {
  return `${idosoId}:${tipo}:${horario}:${origem}`;
}

/**
 * Filtra leituras duplicadas (RF-019).
 */
export function descartarDuplicadas(
  leituras: LeituraTelemetriaItem[],
  idosoId: string
): LeituraTelemetriaItem[] {
  const vistos = new Set<string>();
  return leituras.filter((l) => {
    const chave = gerarChaveDeduplicacao(idosoId, l.tipo, l.timestamp, l.origem);
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

export interface SincronizacaoOptions {
  cliente?: Pick<ApiClient, 'post'>;
  bateriaCelular?: number;
  versaoApp?: string;
  marcadorAnterior?: string | null;
}

export interface ResultadoSincronizacao {
  sucesso: boolean;
  novoMarcador: string | null;
  reenvioAgendado: boolean;
  esperaProximaTentativaMs?: number;
}

/**
 * Envia o lote de telemetria ao backend com controle de marcador (RF-017) e metadados do coletor (RF-020).
 * O marcador da última sincronização só avança após resposta HTTP 2xx bem-sucedida (RF-017).
 */
export async function sincronizarTelemetriaWearable(
  idosoId: string,
  payload: PayloadTelemetriaOpenWearables,
  options: SincronizacaoOptions = {}
): Promise<ResultadoSincronizacao> {
  const cliente = options.cliente ?? apiClient;
  const bateria = options.bateriaCelular ?? 85;
  const versao = options.versaoApp ?? VERSAO_APP_PADRAO;
  const agoraIso = new Date().toISOString();

  // Injeta os metadados obrigatórios do coletor (RF-020)
  payload.metadata = {
    ...payload.metadata,
    versao_app: versao,
    bateria_celular: bateria,
    horario_sincronizacao: agoraIso,
    marcador_ultimo_sync: options.marcadorAnterior ?? undefined,
  };

  try {
    const rota = `/api/v1/idosos/${idosoId}/telemetria-wearable`;
    await cliente.post(rota, payload);

    // Salva no SQLite local a sincronização bem sucedida
    await salvarSyncRelogioLocal(idosoId, agoraIso);
    if (payload.steps?.count || payload.heart_rate?.bpm) {
      await salvarTelemetriaLocal(idosoId, {
        passosHoje: payload.steps?.count ?? 0,
        frequenciaCardiaca: payload.heart_rate?.bpm ?? 0,
        coletadoEm: payload.timestamp,
      });
    }

    // RF-017: Marcador só avança após resposta 2xx
    return {
      sucesso: true,
      novoMarcador: agoraIso,
      reenvioAgendado: false,
    };
  } catch (erro) {
    // RF-018: Falha não avança o marcador e agenda reenvio com espera exponencial
    const proximaEspera = calcularEsperaExponencial(1);
    return {
      sucesso: false,
      novoMarcador: options.marcadorAnterior ?? null,
      reenvioAgendado: true,
      esperaProximaTentativaMs: proximaEspera,
    };
  }
}
