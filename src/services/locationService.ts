import * as Location from 'expo-location';

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/** Posição em cache aceita no SOS: até 2 min. Mais velha que isso pode estar em outro lugar. */
const IDADE_MAXIMA_CACHE_MS = 2 * 60 * 1000;
/** Quanto o SOS continua esperando um fix de GPS depois do disparo. */
export const TEMPO_LIMITE_POSICAO_SOS_MS = 20000;

function paraCoords(pos: Location.LocationObject | null): Coords | null {
  if (!pos?.coords) return null;
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 0,
  };
}

/**
 * Posição do idoso para o SOS (HU-063), buscada DEPOIS do disparo: o SOS não espera por ela.
 * Avisa `onPosicao` com a posição em cache recente (se houver) e de novo com o fix novo (Accuracy.Balanced),
 * que pode levar até ~20 s no Android. Devolve a melhor posição obtida, ou null (sem permissão ou sem fix).
 */
export async function buscarPosicaoSos(
  onPosicao: (coords: Coords) => void,
  { tempoLimiteMs = TEMPO_LIMITE_POSICAO_SOS_MS }: { tempoLimiteMs?: number } = {}
): Promise<Coords | null> {
  try {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      status = (await Location.requestForegroundPermissionsAsync()).status;
    }
    if (status !== 'granted') return null;

    let melhor: Coords | null = null;
    try {
      melhor = paraCoords(await Location.getLastKnownPositionAsync({ maxAge: IDADE_MAXIMA_CACHE_MS }));
      if (melhor) onPosicao(melhor);
    } catch {
      // Sem cache: segue para o fix novo.
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const tempoEsgotado = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), tempoLimiteMs);
    });
    const fix = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then(paraCoords)
      .catch(() => null);
    const fresca = await Promise.race([fix, tempoEsgotado]);
    clearTimeout(timer);

    if (fresca) {
      onPosicao(fresca);
      return fresca;
    }
    if (!melhor) console.warn(`[locationService] SOS sem posição após ${Math.round(tempoLimiteMs / 1000)} s`);
    return melhor;
  } catch (error: any) {
    console.warn('[locationService] Erro ao buscar a posição do SOS:', error?.message);
    return null;
  }
}
