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
