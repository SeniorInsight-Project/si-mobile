/**
 * Nível de bateria do celular em que o app está rodando, em % (0 a 100), pelo expo-battery.
 * null quando o aparelho não informa (simulador, web sem a Battery API) ou o módulo não existe.
 * O módulo é carregado sob demanda para não quebrar os testes em Node.
 */
export function nivelEmPercentual(nivel: unknown): number | null {
  if (typeof nivel !== 'number' || !Number.isFinite(nivel) || nivel < 0 || nivel > 1) return null;
  return Math.round(nivel * 100);
}

export async function lerNivelBateria(): Promise<number | null> {
  try {
    const Battery = require('expo-battery');
    return nivelEmPercentual(await Battery.getBatteryLevelAsync());
  } catch {
    return null;
  }
}
