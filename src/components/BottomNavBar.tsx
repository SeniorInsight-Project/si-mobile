import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { colors, font, rounded, shadows, sizes } from '../theme';
import { usePapel } from '../context/PapelContext';
import { ABAS_POR_PAPEL } from '../services/acessoService';

/** Altura de cada aba e da barra (aba + padding 4 + borda 1, dos dois lados). Fixa: os rótulos têm escala limitada. */
const ALTURA_ABA = 56;
const PADDING_BARRA = 4;
const BORDA_BARRA = 1;
export const ALTURA_BARRA = ALTURA_ABA + 2 * PADDING_BARRA + 2 * BORDA_BARRA;
/** Distância entre a barra e a área segura inferior (indicador inicial do iPhone). */
export const MARGEM_BARRA = 8;
/** Folga entre o fim do conteúdo e o topo da barra. */
export const FOLGA_CONTEUDO = 16;

/** Distância da base da tela até o topo da barra, já com a área segura. */
export function useAlturaBarraInferior(): number {
  const { bottom } = useSafeAreaInsets();
  return ALTURA_BARRA + MARGEM_BARRA + bottom;
}

/** paddingBottom das telas com a barra: o último item do conteúdo fica visível acima dela. */
export function useEspacoBarraInferior(folga: number = FOLGA_CONTEUDO): number {
  return useAlturaBarraInferior() + folga;
}

export interface BottomNavBarProps {
  currentScreen: string;
  onNavigate?: (screen: string) => void;
}

export default function BottomNavBar({ currentScreen, onNavigate }: BottomNavBarProps) {
  const papel = usePapel();
  const tabs = ABAS_POR_PAPEL[papel ?? 'FAMILIAR'];
  const insets = useSafeAreaInsets();

  const isTabActive = (tabId: string) => {
    if (papel === 'IDOSO') return currentScreen === tabId;
    if (tabId === 'Family') {
      return (
        currentScreen === 'Family' ||
        currentScreen === 'ElderlyProfile' ||
        currentScreen === 'EmergencyContacts'
      );
    }
    return currentScreen === tabId;
  };

  return (
    <View style={[styles.navOuterWrapper, { bottom: insets.bottom + MARGEM_BARRA }]} pointerEvents="box-none">
      <View style={styles.bottomTabNav}>
        {tabs.map((tab) => {
          const isActive = isTabActive(tab.id);

          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => onNavigate && onNavigate(tab.id)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
            >
              <View style={styles.iconContainer}>
                <Icon
                  name={tab.icon}
                  size={20}
                  color={isActive ? colors.primary : colors.textMuted}
                />
              </View>
              <Text
                numberOfLines={1}
                style={isActive ? styles.tabLabelActive : styles.tabLabel}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navOuterWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 30,
  },
  bottomTabNav: {
    height: ALTURA_BARRA,
    borderRadius: rounded.full,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: PADDING_BARRA,
    ...shadows.tier3,
    borderWidth: BORDA_BARRA,
    borderColor: colors.border,
  },
  tabItem: {
    flex: 1,
    minWidth: sizes.touchMin,
    minHeight: sizes.touchMin,
    height: ALTURA_ABA,
    borderRadius: rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabItemActive: {
    backgroundColor: colors.infoSurface,
  },
  iconContainer: {
    marginBottom: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 14,
    color: colors.textMuted,
    ...font('body', 600),
  },
  tabLabelActive: {
    fontSize: 14,
    color: colors.primary,
    ...font('body', 700),
  },
});
