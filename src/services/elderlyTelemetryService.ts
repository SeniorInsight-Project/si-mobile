import { obterConsentimentos, type Consentimentos } from './consentimentoService';
import { buscarEstadoAtual, verificarDadosRecentes } from './telemetryService';
import { sincronizarCacheComConsentimentos, consentimentoLocalDe } from './telemetriaCacheService';
import {
  obterTelemetriaLocal,
  salvarTelemetriaLocal,
  type ConsentimentoLocal,
  type TelemetriaLocal,
} from './telemetriaLocalDatabase';
import type { EstadoAtualLido } from './mappers/telemetria';

/**
 * Passos do dia e último batimento na tela do idoso (HU-030 / RF-025 / RNF-006).
 *
 * - Só aparece o tipo que o idoso autorizou e que o servidor confirmou. Sem autorização confirmada
 *   (nem do servidor, nem guardada no aparelho), nada é exibido.
 * - Sem leitura, o valor é null e a tela mostra "Sem dados"; `coletadoEm` vem só do telemetry-service
 *   ou do cache, nunca do relógio do aparelho.
 * - O último estado fica no SQLite para a tela abrir sem internet; ao revogar um tipo, o valor dele sai
 *   do cache (telemetriaCacheService).
 */
export interface BiometriaIdoso {
  passosAutorizados: boolean;
  batimentosAutorizados: boolean;
  /** null = sem leitura. */
  passosHoje: number | null;
  /** Último batimento (BPM); null = sem leitura. */
  frequenciaCardiaca: number | null;
  /** ISO da última leitura, do servidor ou do cache; null se não houve leitura. */
  coletadoEm: string | null;
  origem: 'servidor' | 'cache' | 'nenhuma';
}

export interface DependenciasBiometria {
  obterConsentimentos?: (idosoId: string) => Promise<Consentimentos>;
  buscarEstadoAtual?: (idosoId: string) => Promise<EstadoAtualLido>;
  agora?: () => Date;
}

export const SEM_BIOMETRIA: BiometriaIdoso = {
  passosAutorizados: false,
  batimentosAutorizados: false,
  passosHoje: null,
  frequenciaCardiaca: null,
  coletadoEm: null,
  origem: 'nenhuma',
};

function descrever(erro: unknown): string {
  const codigo = (erro as { codigo?: unknown } | null)?.codigo;
  if (typeof codigo === 'string') return codigo;
  return erro instanceof Error ? erro.name : typeof erro;
}

const numeroOuNulo = (valor: unknown): number | null =>
  typeof valor === 'number' && Number.isFinite(valor) ? valor : null;

function mesmoDia(iso: string, agora: Date): boolean {
  const data = new Date(iso);
  return (
    !isNaN(data.getTime()) &&
    data.getFullYear() === agora.getFullYear() &&
    data.getMonth() === agora.getMonth() &&
    data.getDate() === agora.getDate()
  );
}

type Leitura = Pick<TelemetriaLocal, 'passosHoje' | 'frequenciaCardiaca' | 'coletadoEm'>;

/** Mantém só os tipos autorizados; sem nenhum valor, também não há hora de leitura. */
function filtrarLeitura(leitura: Leitura, consentimento: ConsentimentoLocal): Leitura {
  const passosHoje = consentimento.passos ? numeroOuNulo(leitura.passosHoje) : null;
  const frequenciaCardiaca = consentimento.batimentos ? numeroOuNulo(leitura.frequenciaCardiaca) : null;
  const semValor = passosHoje === null && frequenciaCardiaca === null;
  return { passosHoje, frequenciaCardiaca, coletadoEm: semValor ? null : leitura.coletadoEm ?? null };
}

async function lerCache(idosoId: string): Promise<TelemetriaLocal | null> {
  try {
    return await obterTelemetriaLocal(idosoId);
  } catch (erro) {
    console.warn(`[elderlyTelemetry] Cache local indisponível (${descrever(erro)}).`);
    return null;
  }
}

async function gravarCache(registro: TelemetriaLocal): Promise<void> {
  try {
    await salvarTelemetriaLocal(registro);
  } catch (erro) {
    console.warn(`[elderlyTelemetry] Não foi possível guardar o estado de hoje no cache (${descrever(erro)}).`);
  }
}

export async function carregarBiometriaIdoso(
  idosoId: string | null | undefined,
  deps: DependenciasBiometria = {}
): Promise<BiometriaIdoso> {
  if (!idosoId) return { ...SEM_BIOMETRIA };
  const lerConsentimentos = deps.obterConsentimentos ?? ((id: string) => obterConsentimentos(id));
  const lerEstado = deps.buscarEstadoAtual ?? ((id: string) => buscarEstadoAtual(id));
  const agora = deps.agora ?? (() => new Date());

  // 1. Autorizações: do servidor; sem rede, as últimas confirmadas neste aparelho; sem nenhuma, nada aparece.
  let consentimento: ConsentimentoLocal | null = null;
  try {
    const recebido = await lerConsentimentos(idosoId);
    consentimento = consentimentoLocalDe(recebido);
    await sincronizarCacheComConsentimentos(idosoId, recebido);
  } catch (erro) {
    console.warn(`[elderlyTelemetry] Autorizações indisponíveis; usando as últimas confirmadas (${descrever(erro)}).`);
  }

  const cache = await lerCache(idosoId);
  consentimento = consentimento ?? cache?.consentimento ?? null;
  if (!consentimento || (!consentimento.passos && !consentimento.batimentos)) return { ...SEM_BIOMETRIA };

  const autorizados = {
    passosAutorizados: consentimento.passos,
    batimentosAutorizados: consentimento.batimentos,
  };

  // 2. Estado de hoje do telemetry-service; o cache passa a espelhar a resposta, inclusive a falta de dado.
  try {
    const leitura = filtrarLeitura(await lerEstado(idosoId), consentimento);
    await gravarCache({ idosoId, ...leitura, consentimento });
    return { ...autorizados, ...leitura, origem: 'servidor' };
  } catch (erro) {
    console.warn(`[elderlyTelemetry] Estado de hoje indisponível; usando o cache local (${descrever(erro)}).`);
  }

  // 3. Sem rede: o cache. Passos de outro dia não são "passos hoje".
  if (cache) {
    const doCache = filtrarLeitura(cache, consentimento);
    const passosHoje = doCache.coletadoEm && mesmoDia(doCache.coletadoEm, agora()) ? doCache.passosHoje : null;
    const leitura = filtrarLeitura({ ...doCache, passosHoje }, consentimento);
    if (leitura.coletadoEm) return { ...autorizados, ...leitura, origem: 'cache' };
  }
  return { ...SEM_BIOMETRIA, ...autorizados };
}

// ---------------------------------------------------------------------------
// Apresentação (usada pelo ElderlyMetricsCards)
// ---------------------------------------------------------------------------

export const TEXTO_SEM_DADOS = 'Sem dados';

export interface CartaoBiometria {
  valor: string;
  unidade: string | null;
  rotulo: string;
  acessibilidade: string;
  semDados: boolean;
}

export interface ApresentacaoBiometria {
  /** null = tipo não autorizado: o cartão não aparece. */
  passos: CartaoBiometria | null;
  batimentos: CartaoBiometria | null;
  /** "Atualizado às HH:MM"; null sem leitura. */
  atualizacao: string | null;
}

/**
 * Textos dos cartões. Leitura com mais de 48 h vale como sem dados (HU-031), em vez de mostrar um
 * número antigo como se fosse de hoje.
 */
export function apresentarBiometria(b: BiometriaIdoso, agora: Date = new Date()): ApresentacaoBiometria {
  const recente = b.coletadoEm ? verificarDadosRecentes(b.coletadoEm, 48, agora) : null;
  const valido = recente !== null && !recente.semDadosRecentes;
  const passos = valido ? b.passosHoje : null;
  const batimentos = valido ? b.frequenciaCardiaca : null;
  const passosTexto = passos === null ? null : passos.toLocaleString('pt-BR');

  return {
    passos: b.passosAutorizados
      ? {
          valor: passosTexto ?? TEXTO_SEM_DADOS,
          unidade: null,
          rotulo: 'passos hoje',
          acessibilidade: passosTexto ? `${passosTexto} passos hoje` : 'Passos de hoje: sem dados',
          semDados: passosTexto === null,
        }
      : null,
    batimentos: b.batimentosAutorizados
      ? {
          valor: batimentos === null ? TEXTO_SEM_DADOS : String(batimentos),
          unidade: batimentos === null ? null : 'bpm',
          rotulo: 'batimentos por minuto',
          acessibilidade:
            batimentos === null ? 'Último batimento: sem dados' : `${batimentos} batimentos por minuto`,
          semDados: batimentos === null,
        }
      : null,
    atualizacao: valido && (passos !== null || batimentos !== null) ? recente!.textoAtualizacao : null,
  };
}
