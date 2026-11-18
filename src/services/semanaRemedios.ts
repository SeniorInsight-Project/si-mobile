/**
 * Semana e progresso da tela Remédios, gerados a partir da data atual (pt-BR).
 * Sem dependência de React Native, para os testes em Node.
 */

export interface DiaDaSemana {
  /** Data local no formato AAAA-MM-DD, o mesmo enviado à API em `data`. */
  id: string;
  diaSemana: string;
  diaNumero: string;
  labelCompleta: string;
  /** Nome do dia por extenso, ex.: "Quarta-feira". */
  nomeDia: string;
  ehHoje: boolean;
}

// Índice pelo Date#getDay (0 = domingo).
const NOMES_DIA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const SIGLAS_DIA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** AAAA-MM-DD na data local (não em UTC, para não virar o dia às 21h no Brasil). */
export function dataIsoLocal(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function rotuloDia(data: Date): string {
  return `${NOMES_DIA[data.getDay()]}, ${data.getDate()} ${MESES[data.getMonth()]}`;
}

/** Semana de segunda a domingo que contém `hoje`. */
export function gerarSemana(hoje: Date = new Date()): DiaDaSemana[] {
  const idHoje = dataIsoLocal(hoje);
  const deslocamento = (hoje.getDay() + 6) % 7; // segunda = 0
  const segunda = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - deslocamento);
  return Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + i);
    const id = dataIsoLocal(dia);
    return {
      id,
      diaSemana: SIGLAS_DIA[dia.getDay()],
      diaNumero: String(dia.getDate()),
      labelCompleta: rotuloDia(dia),
      nomeDia: NOMES_DIA[dia.getDay()],
      ehHoje: id === idHoje,
    };
  });
}

export function diaDeHoje(semana: DiaDaSemana[]): DiaDaSemana {
  return semana.find((dia) => dia.ehHoje) ?? semana[0];
}

export interface Progresso {
  tomados: number;
  total: number;
  percentual: number;
}

export function calcularProgresso(tomados: number, total: number): Progresso {
  if (total <= 0) return { tomados: 0, total: 0, percentual: 0 };
  const limitado = Math.min(Math.max(tomados, 0), total);
  return { tomados: limitado, total, percentual: Math.round((limitado / total) * 100) };
}

export type TomRitmo = 'sucesso' | 'neutro' | 'atencao';

/** Mensagem de ritmo coerente com o percentual. Sem remédio no dia, não há mensagem. */
export function mensagemRitmo({ total, percentual }: Progresso): { texto: string; tom: TomRitmo } | null {
  if (total <= 0) return null;
  if (percentual >= 100) return { texto: 'Tudo tomado', tom: 'sucesso' };
  if (percentual >= 70) return { texto: 'Ótimo ritmo', tom: 'sucesso' };
  if (percentual > 0) return { texto: 'Em andamento', tom: 'neutro' };
  return { texto: 'Nenhuma dose ainda', tom: 'atencao' };
}
