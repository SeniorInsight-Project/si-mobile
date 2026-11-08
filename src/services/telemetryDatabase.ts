export interface TelemetriaLocalCache {
  idosoId: string;
  passosHoje: number;
  frequenciaCardiaca: number;
  coletadoEm: string | null;
  atualizadoEm: number;
}

const memoryMap = new Map<string, TelemetriaLocalCache>();

export async function salvarTelemetriaLocal(
  idosoId: string,
  dados: { passosHoje: number; frequenciaCardiaca: number; coletadoEm?: string | null }
): Promise<void> {
  memoryMap.set(idosoId, {
    idosoId,
    passosHoje: dados.passosHoje,
    frequenciaCardiaca: dados.frequenciaCardiaca,
    coletadoEm: dados.coletadoEm || new Date().toISOString(),
    atualizadoEm: Date.now(),
  });
}

export async function obterTelemetriaLocal(
  idosoId: string
): Promise<TelemetriaLocalCache | null> {
  return memoryMap.get(idosoId) || null;
}

export async function limparTelemetriaLocal(): Promise<void> {
  memoryMap.clear();
}
