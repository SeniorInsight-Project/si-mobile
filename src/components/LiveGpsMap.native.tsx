import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import Icon from './Icon';
import IconButton from './IconButton';
import { colors, font, rounded, shadows, sizes } from '../theme';
import {
  carregarTileOsm,
  obterTileEmCache,
  obterUrlPadraoTileOsm,
} from '../services/osmTileService';

const TILE_SIZE = 256;
const ZOOM_LEVEL = 16;
const RADAR_BOX_SIZE = 112;

interface OsmTileImageProps {
  z: number;
  x: number;
  y: number;
  left: number;
  top: number;
}

function OsmTileImage({ z, x, y, left, top }: OsmTileImageProps) {
  const [tileUri, setTileUri] = useState(
    () => obterTileEmCache(z, x, y) || obterUrlPadraoTileOsm(z, x, y)
  );

  useEffect(() => {
    let active = true;
    const cached = obterTileEmCache(z, x, y);
    if (cached) {
      setTileUri(cached);
      return;
    }

    carregarTileOsm(z, x, y).then((resolvedUri) => {
      if (active && resolvedUri) {
        setTileUri(resolvedUri);
      }
    });

    return () => {
      active = false;
    };
  }, [z, x, y]);

  return (
    <Image
      source={{ uri: tileUri }}
      style={[styles.tileImage, { left, top }]}
      resizeMode="cover"
    />
  );
}

function latLonToTilePosition(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const xFloat = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yFloat =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const xTile = Math.floor(xFloat);
  const yTile = Math.floor(yFloat);
  const fx = (xFloat - xTile) * TILE_SIZE;
  const fy = (yFloat - yTile) * TILE_SIZE;

  return { xTile, yTile, fx, fy };
}

/**
 * Mapa da última posição conhecida do idoso. A posição vem por prop (do servidor): o componente não lê o GPS
 * do aparelho em que está aberto.
 */
export interface LiveGpsMapProps {
  latitude: number;
  longitude: number;
  titulo: string;
  subtitulo: string;
  onAtualizar?: () => void;
  atualizando?: boolean;
}

export default function LiveGpsMap({
  latitude,
  longitude,
  titulo,
  subtitulo,
  onAtualizar,
  atualizando = false,
}: LiveGpsMapProps) {
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const lastPanRef = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
      onPanResponderMove: (_, gesture) => {
        setPanOffset({
          x: Math.max(-220, Math.min(220, lastPanRef.current.x + gesture.dx)),
          y: Math.max(-220, Math.min(220, lastPanRef.current.y + gesture.dy)),
        });
      },
      onPanResponderRelease: (_, gesture) => {
        lastPanRef.current = {
          x: Math.max(-220, Math.min(220, lastPanRef.current.x + gesture.dx)),
          y: Math.max(-220, Math.min(220, lastPanRef.current.y + gesture.dy)),
        };
      },
    })
  ).current;

  // Posição nova: recentraliza no pino.
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
    lastPanRef.current = { x: 0, y: 0 };
  }, [latitude, longitude]);

  const tileData = useMemo(
    () => latLonToTilePosition(latitude, longitude, ZOOM_LEVEL),
    [latitude, longitude]
  );

  const tiles = useMemo(() => {
    const list: Array<{
      key: string;
      z: number;
      x: number;
      y: number;
      left: number;
      top: number;
    }> = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = tileData.xTile + dx;
        const ty = tileData.yTile + dy;
        list.push({
          key: `${ZOOM_LEVEL}-${tx}-${ty}`,
          z: ZOOM_LEVEL,
          x: tx,
          y: ty,
          left: (dx + 1) * TILE_SIZE,
          top: (dy + 1) * TILE_SIZE,
        });
      }
    }
    return list;
  }, [tileData.xTile, tileData.yTile]);

  return (
    <View style={styles.mapVisualContainer}>
      {/* Camada 1: Grade 3x3 de Tiles OpenStreetMap */}
      <View
        style={styles.slippyViewport}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.tileGridContainer,
            {
              transform: [
                { translateX: 128 - tileData.fx + panOffset.x },
                { translateY: 101 - tileData.fy + panOffset.y },
              ],
            },
          ]}
        >
          {tiles.map((t) => (
            <OsmTileImage
              key={t.key}
              z={t.z}
              x={t.x}
              y={t.y}
              left={t.left}
              top={t.top}
            />
          ))}
        </View>
      </View>

      {/* Camada 2: Sinalizador (Radar + Pino do idoso) sobreposto e centralizado na área visível */}
      <View style={styles.radarAndPinOverlay} pointerEvents="none">
        <View
          style={[
            styles.radarAndPinBox,
            {
              transform: [
                { translateX: panOffset.x },
                { translateY: panOffset.y },
              ],
            },
          ]}
        >
          <View style={styles.radarOuterCircle} />
          <View style={styles.radarInnerCircle} />
          <View style={styles.elderlyMapPinWrapper}>
            <View style={styles.elderlyMapPin}>
              <Icon name="person" size={24} color={colors.white} />
            </View>
            <View style={styles.pinBaseShadow} />
          </View>
        </View>
      </View>

      {/* Camada 3: Atribuição obrigatória da Tile Usage Policy do OpenStreetMap */}
      <View style={styles.osmAttributionBadge} pointerEvents="none">
        <Text style={styles.osmAttributionText}>© OpenStreetMap</Text>
      </View>

      {/* Camada 4: Barra Branca de Endereço Sobreposta na Parte Inferior do Mapa */}
      <View style={styles.mapAddressBar}>
        <View style={styles.addressLeft}>
          <Icon name="schedule" size={18} color={colors.successDark} />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={styles.addressText} numberOfLines={1}>
              {titulo}
            </Text>
            <Text style={styles.safeZoneText} numberOfLines={1}>
              {subtitulo}
            </Text>
          </View>
        </View>
        {atualizando ? (
          <View style={styles.targetLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : onAtualizar ? (
          <IconButton
            icon="refresh"
            variant="neutral"
            accessibilityLabel="Atualizar localização do idoso"
            onPress={onAtualizar}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapVisualContainer: {
    height: 204,
    backgroundColor: colors.sky.background,
    borderRadius: rounded.card,
    overflow: 'hidden',
    position: 'relative',
  },
  slippyViewport: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },
  tileGridContainer: {
    width: TILE_SIZE * 3,
    height: TILE_SIZE * 3,
    position: 'relative',
  },
  tileImage: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  radarAndPinOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 62,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 6,
    elevation: 4,
  },
  radarAndPinBox: {
    width: RADAR_BOX_SIZE,
    height: RADAR_BOX_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  radarOuterCircle: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: RADAR_BOX_SIZE,
    height: RADAR_BOX_SIZE,
    borderRadius: RADAR_BOX_SIZE / 2,
    backgroundColor: colors.success,
    opacity: 0.16,
    borderWidth: 2,
    borderColor: colors.mint.border,
  },
  radarInnerCircle: {
    position: 'absolute',
    top: (RADAR_BOX_SIZE - 62) / 2,
    left: (RADAR_BOX_SIZE - 62) / 2,
    width: 62,
    height: 62,
    borderRadius: rounded.full,
    backgroundColor: colors.success,
    opacity: 0.26,
  },
  elderlyMapPinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 7,
  },
  elderlyMapPin: {
    width: 46,
    height: 46,
    borderRadius: rounded.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    overflow: 'hidden',
  },
  elderlyPinAvatar: {
    width: 40,
    height: 40,
    borderRadius: rounded.full,
  },
  pinBaseShadow: {
    width: 16,
    height: 6,
    borderRadius: rounded.sm,
    backgroundColor: colors.primary,
    opacity: 0.3,
    marginTop: 2,
  },
  osmAttributionBadge: {
    position: 'absolute',
    top: 8,
    right: 10,
    backgroundColor: colors.surface,
    opacity: 0.85,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.sm,
    zIndex: 8,
    elevation: 5,
  },
  osmAttributionText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    ...font('body', 600),
  },
  mapAddressBar: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    minHeight: 62,
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    ...shadows.tier2,
    zIndex: 10,
  },
  addressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  safeZoneText: {
    fontSize: 14,
    color: colors.successDark,
    ...font('body', 600),
  },
  targetLoading: {
    width: sizes.iconButton,
    height: sizes.iconButton,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
