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

// ---------------------------------------------------------------------------
// Localização contínua: vale quando o idoso liga "Compartilhar sempre" (consentimento LOCALIZACAO).
// Com o app aberto o GPS fica ligado e a última posição fica guardada; o SOS sai com ela na hora.
// ---------------------------------------------------------------------------

let assinatura: Location.LocationSubscription | null = null;
let iniciando: Promise<boolean> | null = null;
let ultimaPosicao: { coords: Coords; em: number } | null = null;

/** Pede a permissão de localização do sistema (se ainda não foi dada). true = concedida. */
export async function solicitarPermissaoLocalizacao(): Promise<boolean> {
  try {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      status = (await Location.requestForegroundPermissionsAsync()).status;
    }
    return status === 'granted';
  } catch (error: any) {
    console.warn('[locationService] Erro ao pedir a permissão de localização:', error?.message);
    return false;
  }
}

/** true quando o GPS está sendo acompanhado (consentimento ligado e permissão concedida). */
export function rastreamentoAtivo(): boolean {
  return assinatura !== null;
}

/** Última posição do acompanhamento contínuo, se ainda for recente (até 2 min). */
export function ultimaPosicaoRastreada(agora: number = Date.now()): Coords | null {
  if (!ultimaPosicao || agora - ultimaPosicao.em > IDADE_MAXIMA_CACHE_MS) return null;
  return ultimaPosicao.coords;
}

/**
 * Liga o acompanhamento contínuo da posição (consentimento "Compartilhar sempre"). Pede a permissão se
 * preciso. Devolve false quando o sistema negou: o consentimento continua salvo, mas o GPS não liga.
 */
export async function iniciarRastreamentoLocalizacao(): Promise<boolean> {
  if (assinatura) return true;
  if (iniciando) return iniciando;
  iniciando = (async () => {
    try {
      if (!(await solicitarPermissaoLocalizacao())) return false;
      if (!(await Location.hasServicesEnabledAsync().catch(() => true))) {
        // GPS do aparelho desligado: o Android mostra o pedido para ligar ao buscar a posição.
        await Location.enableNetworkProviderAsync().catch(() => {});
      }
      assinatura = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 60000, distanceInterval: 25 },
        (pos) => {
          const coords = paraCoords(pos);
          if (coords) ultimaPosicao = { coords, em: Date.now() };
        }
      );
      return true;
    } catch (error: any) {
      console.warn('[locationService] Não foi possível ligar a localização contínua:', error?.message);
      return false;
    } finally {
      iniciando = null;
    }
  })();
  return iniciando;
}

/** Desliga o acompanhamento contínuo (consentimento desligado ou fim da sessão do idoso). */
export function pararRastreamentoLocalizacao(): void {
  assinatura?.remove();
  assinatura = null;
  ultimaPosicao = null;
}

/** Liga ou desliga o GPS contínuo conforme o consentimento LOCALIZACAO do idoso. */
export async function aplicarConsentimentoLocalizacao(ligado: boolean): Promise<boolean> {
  if (!ligado) {
    pararRastreamentoLocalizacao();
    return false;
  }
  return iniciarRastreamentoLocalizacao();
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

    // Com a localização contínua ligada, a posição já está em mãos; senão, o cache do sistema.
    let melhor: Coords | null = ultimaPosicaoRastreada();
    if (!melhor) {
      try {
        melhor = paraCoords(await Location.getLastKnownPositionAsync({ maxAge: IDADE_MAXIMA_CACHE_MS }));
      } catch {
        // Sem cache: segue para o fix novo.
      }
    }
    if (melhor) onPosicao(melhor);

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
