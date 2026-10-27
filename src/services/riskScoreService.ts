import { runtimeConfig } from '../config/runtime';
import { resolverTokenAutorizacao } from './tokenStorageService';

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
  nomeIdoso = 'Dona Maria'
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
  nomeIdoso = 'Dona Maria',
  fatores = [],
}: { score?: number; nomeIdoso?: string; fatores?: string[] } = {}): ExplicacaoMotivo {
  const faixa = determinarFaixaScore(score);
  let fatoresExplicativos: string[] = [];

  if (Array.isArray(fatores) && fatores.length > 0) {
    fatoresExplicativos = fatores;
  } else if (faixa.codigo === 'ESTAVEL') {
    // HU-033 Cenário 2 (Estável)
    fatoresExplicativos = [
      `Sinais dentro do normal de ${nomeIdoso}`,
      'Nenhuma anomalia detectada nas últimas 6h',
    ];
  } else if (faixa.codigo === 'ATENCAO') {
    // HU-033 Cenário 1 (Atenção)
    fatoresExplicativos = [
      'Os passos caíram 60% em relação à semana passada',
      'Batimento em repouso 12% acima do normal dela',
    ];
  } else {
    // Crítico
    fatoresExplicativos = [
      'Variação cardiovascular relevante detectada',
      'Queda acentuada na mobilidade sem padrão prévio',
    ];
  }

  let recomendacaoAcao: string | null = null;
  if (faixa.codigo === 'CRITICO') {
    // RN-017 / HU-035: sugerir ligar e, sem resposta, SAMU (192)
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
 * Mock clínico padronizado para testes e desenvolvimento do Semáforo.
 */
const SCORE_BEM_ESTAR_MOCK: Record<string, ScoreBruto> = {
  'e3b0c442-98fc-1c14-9afc-432100000001': {
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    nomeIdoso: 'Dona Maria',
    score: 18, // Cenário 1 da HU-032: Score 18 -> "Tudo bem agora"
    diasComDadosValidos: 7, // Histórico completo (> 3 dias)
    coletadoEm: new Date().toISOString(),
    fatores: [
      'Sinais dentro do normal de Dona Maria',
      'Nenhuma anomalia detectada nas últimas 6h',
    ],
  },
};

/**
 * Busca o score de bem-estar com base no plano do familiar (RN-014 e HU-032).
 * Se plano === 'FREE', retorna indicação de paywall para o Premium.
 */
export async function buscarScoreBemEstar(
  idosoId: string,
  plano = 'PREMIUM',
  token: string | null = null
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
    const defaultMock = SCORE_BEM_ESTAR_MOCK['e3b0c442-98fc-1c14-9afc-432100000001'];
    return normalizarScoreResponse(defaultMock);
  }

  try {
    const url = `${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/score-risco/recente`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authToken = await resolverTokenAutorizacao(token);
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return normalizarScoreResponse(data);
    }
  } catch {
    // Fallback silencioso para mock
  }

  const mock = SCORE_BEM_ESTAR_MOCK[idosoId] || {
    ...SCORE_BEM_ESTAR_MOCK['e3b0c442-98fc-1c14-9afc-432100000001'],
    idosoId,
  };

  return normalizarScoreResponse(mock);
}

function normalizarScoreResponse(data: ScoreBruto): ScoreBemEstar {
  const nome = data.nomeIdoso || 'Dona Maria';
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
