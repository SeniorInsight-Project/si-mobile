import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * Obtém a localização rápida sem atrasar o envio do SOS de emergência (HU-063).
 * Prioriza cache de última posição conhecida e impõe timeout rígido de 1.5s,
 * sem executar reverse geocoding no caminho crítico do socorro.
 */
export async function obterLocalizacaoRapida(): Promise<Coords | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    let perm = status;
    if (perm !== 'granted') {
      const req = await Location.requestForegroundPermissionsAsync();
      perm = req.status;
    }
    if (perm !== 'granted') {
      return null;
    }

    // Tenta posição recente em cache (latência < 50ms)
    try {
      const cached = await Location.getLastKnownPositionAsync({});
      if (cached && cached.coords) {
        return {
          latitude: cached.coords.latitude,
          longitude: cached.coords.longitude,
          accuracy: cached.coords.accuracy ? Math.round(cached.coords.accuracy) : 10,
        };
      }
    } catch (e) {
      // Ignora e tenta leitura direta
    }

    // Fallback: busca coordenada fresca com timeout de 1500ms
    const timeoutPromise = new Promise<Coords | null>((resolve) =>
      setTimeout(() => resolve(null), 1500)
    );
    const posPromise: Promise<Coords | null> = Location.getCurrentPositionAsync({
      accuracy:
        Platform.OS === 'web'
          ? Location.Accuracy.Balanced
          : Location.Accuracy.High,
    })
      .then((p) =>
        p && p.coords
          ? {
              latitude: p.coords.latitude,
              longitude: p.coords.longitude,
              accuracy: p.coords.accuracy ? Math.round(p.coords.accuracy) : 5,
            }
          : null
      )
      .catch(() => null);

    return await Promise.race([posPromise, timeoutPromise]);
  } catch (error: any) {
    console.warn('[locationService] Erro na localização rápida:', error?.message);
    return null;
  }
}
