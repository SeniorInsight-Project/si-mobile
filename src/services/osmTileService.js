import { Platform } from 'react-native';

// Tamanho exato em bytes do tile de aviso "osm.wiki/Blocked" retornado pelo Fastly/OSM
const OSM_BLOCKED_TILE_BYTES = 6987;

const OSM_TILE_SERVERS = [
  (z, x, y) => `https://tile.openstreetmap.de/${z}/${x}/${y}.png`,
  (z, x, y) => `https://a.tile.openstreetmap.fr/osmfr/${z}/${x}/${y}.png`,
  (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
];

export const OSM_REQUEST_HEADERS = {
  Accept: 'image/png,image/*;q=0.8',
  'User-Agent':
    'SeniorInsightHealthMonitor/1.0 (https://seniorinsight.app; contato@seniorinsight.app)',
  Referer: 'https://seniorinsight.app/',
  'X-Requested-With': 'com.seniorinsight.healthmonitor',
};

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Converte Uint8Array diretamente para Base64 em puro JS (sem usar Response.blob() ou FileReader).
 */
function uint8ArrayParaBase64(bytes) {
  let result = '';
  const len = bytes.length;
  let i = 0;

  while (i < len) {
    const b1 = bytes[i++] & 0xff;
    if (i === len) {
      result += BASE64_CHARS.charAt(b1 >> 2);
      result += BASE64_CHARS.charAt((b1 & 0x3) << 4);
      result += '==';
      break;
    }
    const b2 = bytes[i++] & 0xff;
    if (i === len) {
      result += BASE64_CHARS.charAt(b1 >> 2);
      result += BASE64_CHARS.charAt(((b1 & 0x3) << 4) | ((b2 & 0xf0) >> 4));
      result += BASE64_CHARS.charAt((b2 & 0xf) << 2);
      result += '=';
      break;
    }
    const b3 = bytes[i++] & 0xff;
    result += BASE64_CHARS.charAt(b1 >> 2);
    result += BASE64_CHARS.charAt(((b1 & 0x3) << 4) | ((b2 & 0xf0) >> 4));
    result += BASE64_CHARS.charAt(((b2 & 0xf) << 2) | ((b3 & 0xc0) >> 6));
    result += BASE64_CHARS.charAt(b3 & 0x3f);
  }

  return result;
}

// Cache em memória de tiles ("z-x-y" -> Data URI Base64)
const tileMemoryCache = new Map();
const inFlightTileRequests = new Map();

export function obterTileEmCache(z, x, y) {
  return tileMemoryCache.get(`${z}-${x}-${y}`) || null;
}

export function obterUrlPadraoTileOsm(z, x, y) {
  return OSM_TILE_SERVERS[0](z, x, y);
}

/**
 * Baixa o tile via fetch() + arrayBuffer() (sem disparar aviso de Response.blob()),
 * verifica se não é o tile de bloqueio de 6987 bytes e armazena em cache em memória.
 */
export async function carregarTileOsm(z, x, y) {
  const key = `${z}-${x}-${y}`;

  if (tileMemoryCache.has(key)) {
    return tileMemoryCache.get(key);
  }

  if (Platform.OS === 'web') {
    const directUrl = obterUrlPadraoTileOsm(z, x, y);
    tileMemoryCache.set(key, directUrl);
    return directUrl;
  }

  if (inFlightTileRequests.has(key)) {
    return inFlightTileRequests.get(key);
  }

  const requestPromise = (async () => {
    for (const buildUrl of OSM_TILE_SERVERS) {
      const url = buildUrl(z, x, y);
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: OSM_REQUEST_HEADERS,
        });

        if (!response.ok) {
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        if (
          !bytes ||
          bytes.byteLength === OSM_BLOCKED_TILE_BYTES ||
          bytes.byteLength < 400
        ) {
          continue;
        }

        const base64 = uint8ArrayParaBase64(bytes);
        const dataUri = `data:image/png;base64,${base64}`;
        tileMemoryCache.set(key, dataUri);
        return dataUri;
      } catch (e) {
        // Tenta o próximo servidor oficial do OpenStreetMap
      }
    }

    const fallbackUrl = obterUrlPadraoTileOsm(z, x, y);
    return fallbackUrl;
  })();

  inFlightTileRequests.set(key, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightTileRequests.delete(key);
  }
}
