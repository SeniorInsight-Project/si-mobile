import { apiClient, type ApiClient } from './apiClient';
import { mockPermitido } from '../config/ambiente';

export interface FaixaScore {
  codigo: 'ESTAVEL' | 'ATENCAO' | 'CRITICO';
  min: number;
  max: number;
  titulo: string;
  subtitulo: string;
  statusGeral: string;
  cor: string;
  corFundo: string;
  corBorda: string;
  corTexto: string;
  icone: string;
}

export interface HistoricoMinimo {
  rotinaEmConstrucao: boolean;
  diasComDados: number;
  diasFaltantes: number;
  mensagem: string;
  progressoPercentual: number;
}

export interface ExplicacaoMotivo {
  score: number;
  faixaCodigo: FaixaScore['codigo'];
  faixaTitulo: string;
  statusGeral: string;
  fatores: string[];
  recomendacaoAcao: string | null;
  avisoMedico: string;
}

export interface ScoreBemEstar {
  requerPremium: boolean;
  mensagemPaywall?: string;
  beneficioPaywall?: string;
  idosoId?: string;
  nomeIdoso?: string;
  score?: number;
  faixa?: FaixaScore & { score: number };
  rotinaEmConstrucao?: boolean;
  mensagemRotina?: string;
  diasFaltantes?: number;
  diasComDados?: number;
  progressoPercentual?: number;
  explicacao?: ExplicacaoMotivo;
  atualizadoEm?: string;
}

interface ScoreBruto {
  idosoId?: string;
  nomeIdoso?: string;
  score?: number;
  diasComDadosValidos?: number;
  coletadoEm?: string;
  fatores?: string[];
}

/**
 * Faixas oficiais do Score de Risco Clínico (RN-008 e Modelo SeniorInsight v1.0):
 * - 0 a 39: Estável (Verde, "Tudo bem agora", sem alertas)
 * - 40 a 69: Atenção (Laranja, no máximo 1 alerta preventivo por dia)
 * - 70 a 100: Crítico (Vermelho, alerta urgente com protocolo RN-002)
 */
export const FAIXAS_SCORE: Record<FaixaScore['codigo'], FaixaScore> = {
  ESTAVEL: {
    codigo: 'ESTAVEL',
    min: 0,
    max: 39,
    titulo: 'Tudo bem agora',
    subtitulo: 'Sinais dentro do normal',
    statusGeral: 'Estável & Seguro',
    cor: '#10B981',
    corFundo: '#E8F8F0',
    corBorda: '#B8ECD3',
    corTexto: '#003B26',
    icone: 'check',
  },
  ATENCAO: {
    codigo: 'ATENCAO',
    min: 40,
    max: 69,
    titulo: 'Atenção',
    subtitulo: 'Variação detectada nos sinais vitais',
    statusGeral: 'Atenção Necessária',
    cor: '#F59E0B',
    corFundo: '#FFF8E7',
    corBorda: '#FDE68A',
    corTexto: '#92400E',
    icone: 'warning',
  },
  CRITICO: {
    codigo: 'CRITICO',
    min: 70,
    max: 100,
    titulo: 'Crítico',
    subtitulo: 'Sinais fora do padrão habitual',
    statusGeral: 'Crítico & Urgente',
    cor: '#EF4444',
    corFundo: '#FFEBE5',
    corBorda: '#FFCDC2',
    corTexto: '#7F1D1D',
    icone: 'emergency',
  },
};

export const AVISO_MEDICO_RN017 = 'Informação de apoio ao cuidado; não substitui avaliação médica.';

/**
 * Determina a faixa do Score de Risco de acordo com a RN-008.
 */
export function determinarFaixaScore(score: unknown): FaixaScore & { score: number } {
  const pontuacao = typeof score === 'number' ? Math.round(score) : 0;
  const scoreLimitado = Math.max(0, Math.min(100, pontuacao));

  if (scoreLimitado <= FAIXAS_SCORE.ESTAVEL.max) {
    return { ...FAIXAS_SCORE.ESTAVEL, score: scoreLimitado };
  }
  if (scoreLimitado <= FAIXAS_SCORE.ATENCAO.max) {
    return { ...FAIXAS_SCORE.ATENCAO, score: scoreLimitado };
  }
  return { ...FAIXAS_SCORE.CRITICO, score: scoreLimitado };
}

/**
 * Validação de dados mínimos para inferência do score (RN-016 e HU-032 Cenário 3).
 * Exige no mínimo 3 dias com pelo menos 12 horas de dados coletados por dia.
 */
export function verificarHistoricoMinimo(
  diasComDadosValidos: unknown = 0,
  nomeIdoso = 'Idoso Monitorado'
): HistoricoMinimo {
  const DIAS_MINIMOS = 3;
  const diasValidos = typeof diasComDadosValidos === 'number' ? Math.max(0, diasComDadosValidos) : 0;

  if (diasValidos < DIAS_MINIMOS) {
    const faltam = DIAS_MINIMOS - diasValidos;
    const sufixoDia = faltam === 1 ? 'dia' : 'dias';
    return {
      rotinaEmConstrucao: true,
      diasComDados: diasValidos,
      diasFaltantes: faltam,
      mensagem: `Conhecendo a rotina de ${nomeIdoso}: falta ${faltam} ${sufixoDia}`,
      progressoPercentual: Math.round((diasValidos / DIAS_MINIMOS) * 100),
    };
  }

  return {
    rotinaEmConstrucao: false,
    diasComDados: diasValidos,
    diasFaltantes: 0,
    mensagem: `Rotina de ${nomeIdoso} consolidada`,
    progressoPercentual: 100,
  };
}

/**
 * Gera a explicação do semáforo em linguagem simples (HU-033) e
 * anexa o aviso médico obrigatório da RN-017.
 */
export function obterExplicacaoMotivo({
  score = 18,
  nomeIdoso = 'Idoso Monitorado',
  fatores = [],
}: { score?: number; nomeIdoso?: string; fatores?: string[] } = {}): ExplicacaoMotivo {
  const faixa = determinarFaixaScore(score);
  let fatoresExplicativos: string[] = [];

  if (Array.isArray(fatores) && fatores.length > 0) {
    fatoresExplicativos = fatores;
  } else if (faixa.codigo === 'ESTAVEL') {
    fatoresExplicativos = [
      `Sinais dentro do normal de ${nomeIdoso}`,
      'Nenhuma anomalia detectada nas últimas 6h',
    ];
  } else if (faixa.codigo === 'ATENCAO') {
    fatoresExplicativos = [
      'Os passos caíram 60% em relação à semana passada',
      'Batimento em repouso 12% acima do normal dela',
    ];
  } else {
    fatoresExplicativos = [
      'Variação cardiovascular relevante detectada',
      'Queda acentuada na mobilidade sem padrão prévio',
    ];
  }

  let recomendacaoAcao: string | null = null;
  if (faixa.codigo === 'CRITICO') {
    recomendacaoAcao = `Ligue para ${nomeIdoso}; se ela não atender, acione o SAMU (192).`;
  } else if (faixa.codigo === 'ATENCAO') {
    recomendacaoAcao = `Vale ligar para ${nomeIdoso} e verificar como ela está se sentindo hoje.`;
  }

  return {
    score: faixa.score,
    faixaCodigo: faixa.codigo,
    faixaTitulo: faixa.titulo,
    statusGeral: faixa.statusGeral,
    fatores: fatoresExplicativos,
    recomendacaoAcao,
    avisoMedico: AVISO_MEDICO_RN017,
  };
}

/**
 * Busca o score de bem-estar com base no plano do familiar (RN-014 e HU-032).
 * Se plano === 'FREE', retorna indicação de paywall para o Premium.
 */
export async function buscarScoreBemEstar(
  idosoId: string,
  plano = 'PREMIUM',
  { cliente = apiClient }: { cliente?: Pick<ApiClient, 'get'> } = {}
): Promise<ScoreBemEstar> {
  // Paywall do plano Free (HU-032 e HU-034 Cenário 3)
  if (plano === 'FREE') {
    return {
      requerPremium: true,
      mensagemPaywall: 'O Semáforo de Risco com IA é exclusivo do plano Premium.',
      beneficioPaywall: 'Experimente o Premium por 14 dias sem custo e acompanhe a saúde preventiva com inteligência artificial.',
    };
  }

  if (!idosoId) {
    if (mockPermitido()) {
      const { SCORE_BEM_ESTAR_MOCK } = await import('../mocks/riskScore');
      const defaultMock = SCORE_BEM_ESTAR_MOCK['e3b0c442-98fc-1c14-9afc-432100000001'];
      return normalizarScoreResponse(defaultMock as ScoreBruto);
    }
    throw new Error('ID do idoso não informado.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    const data = await cliente.get<Record<string, any>>(`/api/v1/insight/idosos/${idosoId}/score-risco/recente`, { signal: controller.signal });
    return normalizarScoreResponse(data);
  } catch (erro) {
    // Sem mock permitido a falha sobe para a tela; com mock (só em dev) cai nos dados de demonstração abaixo.
    if (!mockPermitido()) throw erro;
  } finally {
    clearTimeout(timeoutId);
  }

  if (mockPermitido()) {
    const { SCORE_BEM_ESTAR_MOCK } = await import('../mocks/riskScore');
    const mock = SCORE_BEM_ESTAR_MOCK[idosoId] || {
      ...SCORE_BEM_ESTAR_MOCK['e3b0c442-98fc-1c14-9afc-432100000001'],
      idosoId,
    };
    return normalizarScoreResponse(mock as ScoreBruto);
  }

  throw new Error(`Não foi possível calcular o score de bem-estar.`);
}

function normalizarScoreResponse(data: ScoreBruto): ScoreBemEstar {
  const nome = data.nomeIdoso || 'Idoso Monitorado';
  const diasValidos = typeof data.diasComDadosValidos === 'number' ? data.diasComDadosValidos : 7;
  const historico = verificarHistoricoMinimo(diasValidos, nome);

  const scoreValor = typeof data.score === 'number' ? data.score : 18;
  const faixa = determinarFaixaScore(scoreValor);
  const explicacao = obterExplicacaoMotivo({
    score: scoreValor,
    nomeIdoso: nome,
    fatores: data.fatores || [],
  });

  return {
    idosoId: data.idosoId,
    nomeIdoso: nome,
    score: faixa.score,
    faixa,
    rotinaEmConstrucao: historico.rotinaEmConstrucao,
    mensagemRotina: historico.mensagem,
    diasFaltantes: historico.diasFaltantes,
    diasComDados: historico.diasComDados,
    progressoPercentual: historico.progressoPercentual,
    explicacao,
    requerPremium: false,
    atualizadoEm: data.coletadoEm || new Date().toISOString(),
  };
}
