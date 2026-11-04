import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import * as Location from 'expo-location';
import Icon from './Icon';
import { typography } from '../theme';
import {
  obterLocalizacaoAtual,
  DEFAULT_COORDS,
  LocalizacaoAtual,
} from '../services/locationService';
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

export interface LiveGpsMapProps {
  onLocationChange?: (loc: LocalizacaoAtual) => void;
  latitude?: number;
  longitude?: number;
  safeRadiusMeters?: number;
  addressTitle?: string;
  addressSubtitle?: string;
  onPressCenter?: () => void;
}

export default function LiveGpsMap({ onLocationChange }: LiveGpsMapProps) {
  const [coords, setCoords] = useState({
    latitude: DEFAULT_COORDS.latitude,
    longitude: DEFAULT_COORDS.longitude,
    accuracy: DEFAULT_COORDS.accuracy,
  });
  const [addressTitle, setAddressTitle] = useState(
    'Buscando localização atual...'
  );
  const [addressSubtitle, setAddressSubtitle] = useState(
    'Sincronizando GPS em tempo real'
  );
  const [loadingGps, setLoadingGps] = useState(true);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const lastPanRef = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
      onPanResponderGrant: () => {
        lastPanRef.current = { ...panOffset };
      },
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

  const atualizarPosicao = useCallback(async () => {
    try {
      setLoadingGps(true);
      setPanOffset({ x: 0, y: 0 });
      lastPanRef.current = { x: 0, y: 0 };

      const loc = await obterLocalizacaoAtual();

      const nextCoords = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy || 5,
      };
      setCoords(nextCoords);

      if (loc.permissaoConcedida) {
        setAddressTitle(loc.endereco || 'Localização Atual');
        setAddressSubtitle(
          `Dentro do Perímetro Seguro • Precisão ~${nextCoords.accuracy}m`
        );
      } else {
        setAddressTitle(loc.endereco || 'Em casa (Rua das Flores, 142)');
        setAddressSubtitle('Ative o GPS para localização em tempo real');
      }

      if (onLocationChange) {
        onLocationChange(loc);
      }
    } finally {
      setLoadingGps(false);
    }
  }, [onLocationChange]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    atualizarPosicao();

    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 10000,
              distanceInterval: 10,
            },
            (pos) => {
              const next = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy
                  ? Math.round(pos.coords.accuracy)
                  : 5,
              };
              setCoords(next);
            }
          );
        }
      } catch (e) {}
    })();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [atualizarPosicao]);

  const tileData = useMemo(
    () => latLonToTilePosition(coords.latitude, coords.longitude, ZOOM_LEVEL),
    [coords.latitude, coords.longitude]
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

      {/* Camada 2: Sinalizador (Radar + Pino da Dona Maria) sobreposto e centralizado na área visível */}
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
              <Icon name="person" size={24} color="#FFFFFF" />
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
          <Icon name="shield_check" size={18} color="#059669" />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={styles.addressText} numberOfLines={1}>
              {addressTitle}
            </Text>
            <Text style={styles.safeZoneText} numberOfLines={1}>
              {addressSubtitle}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.targetButton}
          activeOpacity={0.8}
          onPress={atualizarPosicao}
          disabled={loadingGps}
        >
          {loadingGps ? (
            <ActivityIndicator size="small" color="#031753" />
          ) : (
            <Icon name="my_location" size={16} color="#031753" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapVisualContainer: {
    height: 196,
    backgroundColor: '#E8F1F5',
    borderRadius: 24,
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
    bottom: 54,
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
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.45)',
  },
  radarInnerCircle: {
    position: 'absolute',
    top: (RADAR_BOX_SIZE - 62) / 2,
    left: (RADAR_BOX_SIZE - 62) / 2,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(16, 185, 129, 0.26)',
  },
  elderlyMapPinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 7,
  },
  elderlyMapPin: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#031753',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  elderlyPinAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  pinBaseShadow: {
    width: 16,
    height: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(3, 23, 83, 0.3)',
    marginTop: 2,
  },
  osmAttributionBadge: {
    position: 'absolute',
    top: 8,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 8,
    elevation: 5,
  },
  osmAttributionText: {
    fontSize: 9,
    color: '#475467',
    fontWeight: '600',
  },
  mapAddressBar: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    height: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 10,
  },
  addressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  safeZoneText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    fontFamily: typography.fontFamily.body,
  },
  targetButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F4F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
