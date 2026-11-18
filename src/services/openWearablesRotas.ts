/** Rotas do Open Wearables, sem dependência nativa (usadas também pelos testes em Node). */
export function rotaTokenSdk(idosoId: string): string {
  return `/api/v1/telemetry/idosos/${idosoId}/open-wearables/sdk-token`;
}
