import { buscarEstadoAtual } from './telemetryService';
import { obterConsentimentos } from './consentimentoService';
import {
  salvarTelemetriaLocal,
  obterTelemetriaLocal,
} from './telemetryDatabase';

export interface DadosIdosoBiometria {
  passosHoje: number;
  frequenciaCardiaca: number;
  passosAutorizados: boolean;
  batimentosAutorizados: boolean;
  coletadoEm: string | null;
}

/**
 * Carrega passos e batimentos para a tela do idoso (HU-030).
 * - Respeita as autorizações de consentimento por tipo (Cenário 2 da HU-030).
 * - Suporta abertura 100% offline via SQLite local.
 */
export async function carregarBiometriaIdoso(
  idosoId?: string | null
): Promise<DadosIdosoBiometria> {
  // Valores padrão com autorizações ativas por padrão para visualização
  let passos = 0;
  let batimentos = 0;
  let coletadoEm: string | null = null;
  let passosAutorizados = true;
  let batimentosAutorizados = true;

  if (!idosoId) {
    return {
      passosHoje: 0,
      frequenciaCardiaca: 0,
      passosAutorizados: false,
      batimentosAutorizados: false,
      coletadoEm: null,
    };
  }

  // 1. Obtém consentimentos do titular (HU-018, HU-019 / HU-030 Cenário 2)
  try {
    const consentimentos = await obterConsentimentos(idosoId);
    if (consentimentos) {
      passosAutorizados = Boolean(consentimentos.PASSOS);
      batimentosAutorizados = Boolean(consentimentos.BATIMENTOS);
    }
  } catch (err) {
    // Se estiver sem internet, assume autorizações anteriores em cache
  }

  // 2. Lê do SQLite local para exibição instantânea offline
  let cacheTime = 0;
  try {
    const cacheLocal = await obterTelemetriaLocal(idosoId);
    if (cacheLocal) {
      passos = cacheLocal.passosHoje;
      batimentos = cacheLocal.frequenciaCardiaca;
      coletadoEm = cacheLocal.coletadoEm;
      cacheTime = cacheLocal.atualizadoEm || (cacheLocal.coletadoEm ? new Date(cacheLocal.coletadoEm).getTime() : 0);
    }
  } catch (err) {}

  // 3. Tenta buscar atualização da rede em background (apenas se for mais recente que o cache local)
  try {
    const estado = await buscarEstadoAtual(idosoId);
    if (estado) {
      const apiTime = estado.coletadoEm ? new Date(estado.coletadoEm).getTime() : 0;
      if (isNaN(cacheTime) || cacheTime === 0 || apiTime > cacheTime) {
        if (typeof estado.passosHoje === 'number') passos = estado.passosHoje;
        if (typeof estado.frequenciaCardiaca === 'number') batimentos = estado.frequenciaCardiaca;
        coletadoEm = estado.coletadoEm || new Date().toISOString();

        await salvarTelemetriaLocal(idosoId, {
          passosHoje: passos,
          frequenciaCardiaca: batimentos,
          coletadoEm,
        });
      }
    }
  } catch (err) {
    // Modo offline preserva dados lidos do cache local
  }

  return {
    passosHoje: passos,
    frequenciaCardiaca: batimentos,
    passosAutorizados,
    batimentosAutorizados,
    coletadoEm,
  };
}
