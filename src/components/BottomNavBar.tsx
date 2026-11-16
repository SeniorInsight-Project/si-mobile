import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { colors, font, rounded, shadows, sizes } from '../theme';
import { usePapel } from '../context/PapelContext';
import { ABAS_POR_PAPEL } from '../services/acessoService';

export interface BottomNavBarProps {
  currentScreen: string;
  onNavigate?: (screen: string) => void;
}

export default function BottomNavBar({ currentScreen, onNavigate }: BottomNavBarProps) {
  const papel = usePapel();
  const tabs = ABAS_POR_PAPEL[papel ?? 'FAMILIAR'];

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
    <View style={styles.navOuterWrapper} pointerEvents="box-none">
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
    bottom: 12,
    left: 16,
    right: 16,
    zIndex: 30,
  },
  bottomTabNav: {
    minHeight: 64,
    borderRadius: rounded.full,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 4,
    ...shadows.tier3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabItem: {
    flex: 1,
    minWidth: sizes.touchMin,
    minHeight: sizes.touchMin,
    height: 56,
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
