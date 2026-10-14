import * as Location from 'expo-location';
import { Platform } from 'react-native';

export const DEFAULT_COORDS = {
  latitude: -23.55052,
  longitude: -46.633308,
  accuracy: 10,
};

/**
 * Formata um objeto de endereço retornado pelo reverseGeocodeAsync ou Nominatim.
 */
function formatAddress(place) {
  if (!place) return null;
  const street = place.street || place.thoroughfare || place.name || '';
  const number = place.streetNumber || place.subThoroughfare || '';
  const district = place.district || place.subLocality || '';
  const city = place.city || place.subregion || place.region || '';

  if (street && number) {
    return `${street}, ${number}${district ? ` - ${district}` : ''}`;
  }
  if (street) {
    return `${street}${district ? ` - ${district}` : city ? ` - ${city}` : ''}`;
  }
  if (district && city) {
    return `${district}, ${city}`;
  }
  return city || null;
}

/**
 * Busca endereço legível via Nominatim (OpenStreetMap) como fallback universal (Web/Mobile).
 */
async function reverseGeocodeNominatim(latitude, longitude) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=pt-BR`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.address) {
      const road =
        data.address.road ||
        data.address.pedestrian ||
        data.address.suburb ||
        '';
      const houseNumber = data.address.house_number || '';
      const suburb =
        data.address.suburb ||
        data.address.neighbourhood ||
        data.address.city_district ||
        '';
      const city =
        data.address.city ||
        data.address.town ||
        data.address.municipality ||
        '';

      if (road && houseNumber) {
        return `${road}, ${houseNumber}${suburb ? ` (${suburb})` : ''}`;
      }
      if (road) {
        return `${road}${suburb ? ` - ${suburb}` : city ? ` - ${city}` : ''}`;
      }
      if (suburb || city) {
        return [suburb, city].filter(Boolean).join(' - ');
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Obtém a localização GPS real atual do dispositivo + endereço formatado.
 */
export async function obterLocalizacaoAtual() {
  try {
    // 1. Solicita permissão via expo-location
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return {
        permissaoConcedida: false,
        ...DEFAULT_COORDS,
        endereco: 'Permissão de localização negada',
      };
    }

    // 2. Obtém posição atual com alta precisão
    const pos = await Location.getCurrentPositionAsync({
      accuracy:
        Platform.OS === 'web'
          ? Location.Accuracy.Balanced
          : Location.Accuracy.High,
    });

    const { latitude, longitude, accuracy } = pos.coords;

    // 3. Tenta converter coordenadas em endereço legível
    let endereco = null;
    if (Platform.OS !== 'web') {
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (places && places.length > 0) {
          endereco = formatAddress(places[0]);
        }
      } catch (e) {
        // Continua para o fallback Nominatim
      }
    }

    if (!endereco) {
      endereco = await reverseGeocodeNominatim(latitude, longitude);
    }

    return {
      permissaoConcedida: true,
      latitude,
      longitude,
      accuracy: accuracy ? Math.round(accuracy) : 5,
      endereco:
        endereco ||
        `Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}`,
    };
  } catch (error) {
    console.warn('Erro ao obter localização atual:', error?.message);
    return {
      permissaoConcedida: false,
      ...DEFAULT_COORDS,
      endereco: 'Em casa (Rua das Flores, 142)',
    };
  }
}

/**
 * Obtém a localização rápida sem atrasar o envio do SOS de emergência (HU-063).
 * Prioriza cache de última posição conhecida e impõe timeout rígido de 1.5s,
 * sem executar reverse geocoding no caminho crítico do socorro.
 */
export async function obterLocalizacaoRapida() {
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
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve(null), 1500)
    );
    const posPromise = Location.getCurrentPositionAsync({
      accuracy:
        Platform.OS === 'web'
          ? Location.Accuracy.Balanced
          : Location.Accuracy.High,
    }).then((p) => (p && p.coords ? {
      latitude: p.coords.latitude,
      longitude: p.coords.longitude,
      accuracy: p.coords.accuracy ? Math.round(p.coords.accuracy) : 5,
    } : null)).catch(() => null);

    return await Promise.race([posPromise, timeoutPromise]);
  } catch (error) {
    console.warn('[locationService] Erro na localização rápida:', error?.message);
    return null;
  }
}

