import { colors } from './index';

/**
 * Siglas e cor de avatar a partir do nome.
 * A cor sai do próprio nome, então a mesma pessoa tem sempre a mesma cor (header, família, contatos).
 */

const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/** "Pedro de Sousa Lima" -> "PL"; "Maria" -> "MA"; vazio -> "?". */
export function iniciaisDoNome(nome?: string | null): string {
  const palavras = (nome ?? '')
    .trim()
    .split(/\s+/)
    .filter((p) => p && !PARTICULAS.has(p.toLowerCase()));
  if (palavras.length === 0) return '?';
  if (palavras.length === 1) return palavras[0].slice(0, 2).toUpperCase();
  return (palavras[0][0] + palavras[palavras.length - 1][0]).toUpperCase();
}

export interface CorAvatar {
  background: string;
  border: string;
  text: string;
}

/** Pastéis funcionais do tema, com o tom escuro do mesmo pastel no texto (contraste AA). */
export const CORES_AVATAR: CorAvatar[] = [
  { background: colors.sky.background, border: colors.sky.border, text: colors.sky.textDark },
  { background: colors.mint.background, border: colors.mint.border, text: colors.mint.textDark },
  { background: colors.lavender.background, border: colors.lavender.border, text: colors.lavender.textDark },
  { background: colors.amber.background, border: colors.amber.border, text: colors.amber.textDark },
  { background: colors.peach.background, border: colors.peach.border, text: colors.peach.textDark },
];

export function corDoAvatar(nome?: string | null): CorAvatar {
  const base = (nome ?? '').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  return CORES_AVATAR[hash % CORES_AVATAR.length];
}
