import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Icon from './Icon';
import { colors } from '../theme';
import { obterUrlPadraoTileOsm } from '../services/osmTileService';

const TILE = 256;
const ZOOM = 16;

/** Posição fracionária do ponto no mosaico de tiles do OpenStreetMap (projeção Web Mercator). */
export function posicaoNoMapa(lat: number, lon: number, zoom: number = ZOOM) {
  const n = 2 ** zoom;
  const x = ((lon + 180) / 360) * n;
  const rad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  return { x, y };
}

export interface SosLocationMapProps {
  latitude: number;
  longitude: number;
  height?: number;
}

/**
 * Mapa estático do local do pedido de SOS (HU-065): 3×3 tiles do OpenStreetMap centrados no ponto,
 * com um alfinete. Sem chave de API e sem mover o mapa — é o retrato do momento do pedido.
 */
export default function SosLocationMap({ latitude, longitude, height = 200 }: SosLocationMapProps) {
  const { x, y } = posicaoNoMapa(latitude, longitude);
  const xTile = Math.floor(x);
  const yTile = Math.floor(y);
  const deslocX = (x - xTile) * TILE;
  const deslocY = (y - yTile) * TILE;

  const tiles: Array<{ key: string; uri: string; left: number; top: number }> = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      tiles.push({
        key: `${dx},${dy}`,
        uri: obterUrlPadraoTileOsm(ZOOM, xTile + dx, yTile + dy),
        // o ponto fica no centro do quadro: o mosaico anda para compensar o deslocamento dentro do tile
        left: dx * TILE - deslocX,
        top: dy * TILE - deslocY,
      });
    }
  }

  return (
    <View style={[styles.frame, { height }]} accessibilityLabel="Mapa da localização no momento do pedido" testID="sos-mapa">
      <View style={styles.mosaic} pointerEvents="none">
        {tiles.map((t) => (
          <Image key={t.key} source={{ uri: t.uri }} style={[styles.tile, { left: t.left, top: t.top }]} />
        ))}
      </View>
      <View style={styles.pin} pointerEvents="none">
        <Icon name="location_on" size={44} color={colors.coralDark} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: 20, overflow: 'hidden', backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  // origem do mosaico no centro do quadro
  mosaic: { position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 },
  tile: { position: 'absolute', width: TILE, height: TILE },
  pin: { marginBottom: 40 },
});
