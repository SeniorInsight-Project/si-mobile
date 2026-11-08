import { mockPermitido } from '../config/ambiente';
import { buscarStatusDispositivo } from './deviceStatusService';
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

/**
 * Carrega o status do relógio para a tela do idoso com suporte 100% offline via SQLite.
 *
 * NOTA DE ARQUITETURA / TELEMETRIA:
 * Conforme revisão da HU-025, o status definitivo do dispositivo em produção deverá consumir
 * o endpoint 'GET /status' do serviço de telemetria (SeniorInsight-Project/si-telemetry-service#17).
 * Como o PR #17 da telemetria ainda está pendente de merge no backend, a integração direta via
 * apiClient está registrada para um card dedicado. No momento, o status utiliza o cache local
 * persistido via SQLite (relogioDatabase) e, quando há rede, tenta o serviço existente de status
 * com fallback offline.
 */
export async function carregarStatusRelogioIdoso(
  idosoId?: string | null
): Promise<StatusRelogioIdoso> {
  if (!idosoId) {
    return avaliarStatusRelogioIdoso(null);
  }

  // 1. Tenta obter o último timestamp salvo localmente no SQLite
  let syncTimestamp = await obterSyncRelogioLocal(idosoId);

  // 2. Se tiver rede, tenta atualizar do backend em background (apenas se for mais recente que o local)
  try {
    const statusApi = await buscarStatusDispositivo(idosoId);
    if (statusApi?.ultimaSincronizacao) {
      const apiTime = new Date(statusApi.ultimaSincronizacao).getTime();
      const localTime = syncTimestamp ? new Date(syncTimestamp).getTime() : 0;
      if (isNaN(localTime) || apiTime > localTime) {
        syncTimestamp = statusApi.ultimaSincronizacao;
        await salvarSyncRelogioLocal(idosoId, syncTimestamp);
      }
    }
  } catch (err) {
    console.warn(
      '[relogioStatusService] Backend indisponível, usando cache local:',
      err instanceof Error ? err.message : 'offline'
    );
  }

  // 3. Fallback mock apenas se permitido e sem dados
  if (!syncTimestamp && mockPermitido()) {
    // Mock padrão: 10 minutos atrás (Cenário 1 da HU-025)
    syncTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await salvarSyncRelogioLocal(idosoId, syncTimestamp);
  }

  return avaliarStatusRelogioIdoso(syncTimestamp);
}
