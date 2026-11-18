/**
 * Para quem o SOS liga quando a internet falha ou quando o idoso toca em "Ligar".
 * Nunca usa número fictício: sem contato de emergência com telefone, liga para o SAMU (192).
 */
export const TELEFONE_SAMU = '192';

export const AVISO_SEM_CONTATO =
  'Você ainda não tem contato de emergência cadastrado. Em uma emergência, ligue para o SAMU (192).';

export interface DestinoLigacaoEmergencia {
  /** Só dígitos, pronto para `tel:`. */
  telefone: string;
  /** Texto do botão: "Ligar para Ana" ou "Ligar para o SAMU (192)". */
  rotulo: string;
  /** Nome de quem atende, para mensagens de erro. */
  nome: string;
  semContato: boolean;
}

export function destinoLigacaoEmergencia(
  contato?: { nome?: string | null; telefone?: string | null } | null
): DestinoLigacaoEmergencia {
  const digitos = (contato?.telefone ?? '').replace(/\D/g, '');
  if (digitos.length >= 3) {
    const nome = contato?.nome?.trim() || 'seu contato de emergência';
    return { telefone: digitos, rotulo: `Ligar para ${nome}`, nome, semContato: false };
  }
  return { telefone: TELEFONE_SAMU, rotulo: 'Ligar para o SAMU (192)', nome: 'o SAMU (192)', semContato: true };
}
