/**
 * Regra de seleção do idoso na Home: mantém a escolha atual se ela ainda está na lista;
 * senão cai no primeiro da lista; sem lista, nenhum idoso.
 */
export function escolherIdosoSelecionado<T extends { idosoId: string }>(
  lista: readonly T[],
  idosoIdAtual?: string | null
): T | null {
  if (!Array.isArray(lista) || lista.length === 0) return null;
  const atual = idosoIdAtual ? lista.find((idoso) => idoso.idosoId === idosoIdAtual) : undefined;
  return atual ?? lista[0];
}
