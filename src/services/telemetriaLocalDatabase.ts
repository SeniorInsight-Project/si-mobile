/**
 * Cache local do estado de hoje do idoso (HU-030), para a tela abrir sem internet.
 * Fallback em memória para Web e testes Node; o nativo usa SQLite (telemetriaLocalDatabase.native.ts).
 *
 * Guarda só o que veio do servidor: valores ausentes ficam null, sem zero nem hora inventada.
 */
export interface ConsentimentoLocal {
  passos: boolean;
  batimentos: boolean;
}

export interface TelemetriaLocal {
  idosoId: string;
  /** null = sem leitura (ou tipo não autorizado). */
  passosHoje: number | null;
  frequenciaCardiaca: number | null;
  /** ISO da última leitura, como veio do telemetry-service; null se não houve leitura. */
  coletadoEm: string | null;
  /** Últimas autorizações confirmadas pelo servidor; null se nunca foram confirmadas neste aparelho. */
  consentimento: ConsentimentoLocal | null;
}

const registros = new Map<string, TelemetriaLocal>();

export async function obterTelemetriaLocal(idosoId: string): Promise<TelemetriaLocal | null> {
  const r = registros.get(idosoId);
  return r ? { ...r, consentimento: r.consentimento ? { ...r.consentimento } : null } : null;
}

export async function salvarTelemetriaLocal(registro: TelemetriaLocal): Promise<void> {
  registros.set(registro.idosoId, {
    ...registro,
    consentimento: registro.consentimento ? { ...registro.consentimento } : null,
  });
}

/** Sem `idosoId`, apaga tudo. */
export async function limparTelemetriaLocal(idosoId?: string): Promise<void> {
  if (idosoId) registros.delete(idosoId);
  else registros.clear();
}
