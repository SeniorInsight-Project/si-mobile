import { buscarStatusDispositivo } from './deviceStatusService';
import type { ClienteTelemetria } from './telemetriaApi';
import {
  salvarSyncRelogioLocal,
  obterSyncRelogioLocal,
} from './relogioDatabase';

export interface StatusRelogioIdoso {
  funcionando: boolean;
  titulo: string;
  subtitulo: string;
  cor: string;
  corFundo: string;
  corBorda: string;
  icone: string;
  minutosDesdeSincronizacao: number;
}

/**
 * Avalia o status do relógio na tela do idoso conforme HU-025.
 * Cenário 1 (funcionando): sincronização recente (< 2h) -> ícone verde e "Relógio funcionando"
 * Cenário 2 (parado): sem sincronização há >= 2h ou sem dados -> ícone laranja e "Seu relógio parou de enviar dados"
 */
export function avaliarStatusRelogioIdoso(
  ultimaSincronizacao: string | null | undefined,
  dataReferencia: Date = new Date(),
  limiteMinutos = 120 // 2 horas de tolerância diurna
): StatusRelogioIdoso {
  if (!ultimaSincronizacao) {
    return {
      funcionando: false,
      titulo: 'Seu relógio parou de enviar dados',
      subtitulo: 'Toque para verificar a conexão do relógio.',
      cor: '#D97706',
      corFundo: '#FFFBEB',
      corBorda: '#FDE68A',
      icone: 'warning',
      minutosDesdeSincronizacao: Infinity,
    };
  }

  const syncDate = new Date(ultimaSincronizacao);
  if (isNaN(syncDate.getTime())) {
    return {
      funcionando: false,
      titulo: 'Seu relógio parou de enviar dados',
      subtitulo: 'Toque para verificar a conexão do relógio.',
      cor: '#D97706',
      corFundo: '#FFFBEB',
      corBorda: '#FDE68A',
      icone: 'warning',
      minutosDesdeSincronizacao: Infinity,
    };
  }

  const diffMs = dataReferencia.getTime() - syncDate.getTime();
  const minutos = Math.max(0, Math.floor(diffMs / (1000 * 60)));

  if (minutos >= limiteMinutos) {
    return {
      funcionando: false,
      titulo: 'Seu relógio parou de enviar dados',
      subtitulo:
        minutos >= 60
          ? `Último envio há ${Math.floor(minutos / 60)}h. Toque para reconectar.`
          : `Último envio há ${minutos} min. Toque para reconectar.`,
      cor: '#D97706',
      corFundo: '#FFFBEB',
      corBorda: '#FDE68A',
      icone: 'warning',
      minutosDesdeSincronizacao: minutos,
    };
  }

  return {
    funcionando: true,
    titulo: 'Relógio funcionando',
    subtitulo: minutos < 1 ? 'Sincronizado agora' : `Sincronizado há ${minutos} min`,
    cor: '#10B981',
    corFundo: '#E8F8F0',
    corBorda: '#B8ECD3',
    icone: 'watch',
    minutosDesdeSincronizacao: minutos,
  };
}

export type CodigoErroRelogioStatus = 'SEM_DADOS';

export class RelogioStatusError extends Error {
  readonly codigo: CodigoErroRelogioStatus;

  constructor(mensagem: string, codigo: CodigoErroRelogioStatus = 'SEM_DADOS') {
    super(mensagem);
    this.name = 'RelogioStatusError';
    this.codigo = codigo;
  }
}

export interface OpcoesStatusRelogio {
  cliente?: ClienteTelemetria;
  dataReferencia?: Date;
}

/**
 * Status do relógio para a tela do idoso (HU-025).
 *
 * A fonte é o GET /api/v1/telemetry/idosos/{id}/status do telemetry-service, lido por
 * buscarStatusDispositivo. A última sincronização devolvida é gravada no SQLite (relogioDatabase),
 * que serve só de cache para o modo offline: é lido quando a API falha.
 * Sem resposta da API e sem cache não há o que mostrar, e a função lança RelogioStatusError
 * em vez de inventar um status.
 */
export async function carregarStatusRelogioIdoso(
  idosoId?: string | null,
  { cliente, dataReferencia }: OpcoesStatusRelogio = {}
): Promise<StatusRelogioIdoso> {
  if (!idosoId) {
    return avaliarStatusRelogioIdoso(null, dataReferencia);
  }

  try {
    // permitirMock: false, para uma falha da API cair no cache e não nos dados de demonstração.
    const statusApi = await buscarStatusDispositivo(idosoId, { cliente, permitirMock: false });
    if (statusApi.ultimaSincronizacao) {
      await salvarSyncRelogioLocal(idosoId, statusApi.ultimaSincronizacao).catch((err) => {
        console.warn('[relogioStatusService] Não foi possível gravar o cache local:', err instanceof Error ? err.message : err);
      });
    }
    return avaliarStatusRelogioIdoso(statusApi.ultimaSincronizacao, dataReferencia);
  } catch (err) {
    console.warn(
      '[relogioStatusService] API de telemetria indisponível, usando cache local:',
      err instanceof Error ? err.message : 'falha'
    );
  }

  const emCache = await obterSyncRelogioLocal(idosoId);
  if (!emCache) {
    throw new RelogioStatusError('Não foi possível obter o status do relógio e não há dados salvos no aparelho.');
  }
  return avaliarStatusRelogioIdoso(emCache, dataReferencia);
}
