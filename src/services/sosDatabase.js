/**
 * Fallback de banco de dados para Web e ambientes não nativos (Node / Web bundler).
 * Evita o carregamento do módulo nativo expo-sqlite / wa-sqlite no browser.
 */
export async function getSosDatabase() {
  return null;
}
