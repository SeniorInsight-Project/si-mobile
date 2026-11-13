import { mockPermitido } from '../config/ambiente';
import { apiClient, type ApiClient } from './apiClient';
import { extrairMensagemErro } from './erroHelper';

/**
 * Direito ao Premium e período de teste de 14 dias (HU-040, HU-041, HU-042 / RF-031, RF-032 / RN-013, RN-014).
 *
 * TODO(billing#9): confirmar rota estável quando billing#9 entrar no si-contracts/gateway.
 */
export const ROTA_DIREITO_PREMIUM = '/api/v1/billing/direito';

export type StatusPlano = 'FREE' | 'TRIAL' | 'PREMIUM' | 'BENEFICIARIO_B2B';

export interface DireitoPremium {
  status: StatusPlano;
  premiumLiberado: boolean;
  trialDisponivel: boolean;
  trialExpiraEm: string | null;
  precoMensalTexto: string | null;
  mensagemB2B?: string | null;
}

export interface OpcoesPremium {
  cliente?: Pick<ApiClient, 'get'>;
}

export class PremiumError extends Error {
  constructor(mensagem = 'Não foi possível verificar seu plano.') {
    super(mensagem);
    this.name = 'PremiumError';
  }
}

export interface RecursosVitais {
  sos: true;
  perdaDados: true;
  bateriaBaixa: true;
  lembreteRemedio: true;
}

/**
 * RN-014: Segurança nunca é paga. SOS, alerta de perda de dados, bateria baixa e
 * lembrete de remédio permanecem 100% livres em qualquer estado do plano (inclusive Free ou erro).
 */
export function recursosVitaisSempreLiberados(_direito?: DireitoPremium | null): RecursosVitais {
  return {
    sos: true,
    perdaDados: true,
    bateriaBaixa: true,
    lembreteRemedio: true,
  };
}

export async function obterDireitoPremium({ cliente = apiClient }: OpcoesPremium = {}): Promise<DireitoPremium> {
  if (mockPermitido()) {
    const expira = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    return {
      status: 'TRIAL',
      premiumLiberado: true,
      trialDisponivel: false,
      trialExpiraEm: expira,
      precoMensalTexto: null,
      mensagemB2B: null,
    };
  }

  try {
    return await cliente.get<DireitoPremium>(ROTA_DIREITO_PREMIUM);
  } catch (erro) {
    const detalhe = extrairMensagemErro(erro, 'Não foi possível verificar seu plano.');
    console.warn('[premiumService] Falha ao consultar direito Premium:', detalhe);
    throw new PremiumError('Não foi possível verificar seu plano.');
  }
}

/** HU-040 Cenário 1: "Premium grátis até DD/MM". */
export function formatarFaixaTrial(direito?: DireitoPremium | null): string | null {
  if (!direito || direito.status !== 'TRIAL' || !direito.trialExpiraEm) {
    return null;
  }
  const data = new Date(direito.trialExpiraEm);
  if (Number.isNaN(data.getTime())) return null;
  const dia = String(data.getUTCDate()).padStart(2, '0');
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
  return `Premium grátis até ${dia}/${mes}`;
}

/** HU-042: Avisa 3 dias e 1 dia antes do fim do teste (não avisa se já assinou). */
export function avisoFimTrial(
  direito?: DireitoPremium | null,
  agoraMs: number = Date.now()
): string | null {
  if (!direito || direito.status !== 'TRIAL' || !direito.trialExpiraEm) {
    return null;
  }
  const expiraMs = Date.parse(direito.trialExpiraEm);
  if (Number.isNaN(expiraMs)) return null;
  const diasRestantes = Math.ceil((expiraMs - agoraMs) / (24 * 60 * 60 * 1000));
  if (diasRestantes === 3) return 'Seu Premium grátis termina em 3 dias';
  if (diasRestantes === 1) return 'Seu Premium grátis termina em 1 dia';
  return null;
}

export interface ComparativoPlanos {
  recursosFree: string[];
  recursosPremium: string[];
  precoMensalTexto: string | null;
  mensagemB2B: string | null;
}

/** HU-041: Comparação simples Free x Premium + preço vindo do backend. */
export function comparativoPlanos(direito?: DireitoPremium | null): ComparativoPlanos {
  return {
    recursosFree: [
      'Botão SOS de emergência e escalonamento familiar (sempre grátis)',
      'Alertas de bateria baixa e perda de dados do celular (sempre grátis)',
      'Lembretes de medicamentos e confirmação (sempre grátis)',
    ],
    recursosPremium: [
      'Semáforo do Bem-Estar com análise preditiva por IA',
      'Alertas preventivos de Atenção e Crítico',
      'Resumo semanal e Relatório Clínico Preventivo para o médico',
    ],
    precoMensalTexto: direito?.precoMensalTexto ?? null,
    mensagemB2B:
      direito?.status === 'BENEFICIARIO_B2B'
        ? direito.mensagemB2B || 'Premium incluso pelo seu plano de saúde'
        : null,
  };
}
