/**
 * Controle de ambiente e política de mocks do app.
 *
 * Mocks e dados fixos de demonstração SÓ são permitidos quando:
 * 1. O app está rodando em modo de desenvolvimento (__DEV__ === true ou NODE_ENV !== 'production'); E
 * 2. A variável de ambiente EXPO_PUBLIC_USAR_MOCK está explicitamente como 'true' ou '1'.
 *
 * Em build de produção (__DEV__ === false ou NODE_ENV === 'production') ou quando a variável não for 'true',
 * NUNCA é permitido mockar dados (o app deve falar com a API ou lançar erro).
 */

declare const __DEV__: boolean | undefined;

export function mockPermitido(
  emDev?: boolean,
  usarMock?: string | null
): boolean {
  const dev = typeof emDev === 'boolean'
    ? emDev
    : (typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production');

  const mock = typeof usarMock === 'string'
    ? usarMock
    : (usarMock === null ? undefined : process.env.EXPO_PUBLIC_USAR_MOCK);

  return dev === true && (mock === 'true' || mock === '1');
}
