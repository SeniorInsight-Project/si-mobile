import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { colors, typography } from '../theme';

export interface BottomNavBarProps {
  currentScreen: string;
  onNavigate?: (screen: string) => void;
}

export default function BottomNavBar({ currentScreen, onNavigate }: BottomNavBarProps) {
  const tabs = [
    { id: 'Home', label: 'Início', icon: 'vital_signs' },
    { id: 'Medicines', label: 'Remédios', icon: 'medication' },
    { id: 'ElderlyMode', label: 'SOS Idoso', icon: 'crisis_alert' },
    { id: 'Family', label: 'Família', icon: 'groups' },
  ];

  const isTabActive = (tabId: string) => {
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
            >
              <View style={styles.iconContainer}>
                <Icon
                  name={tab.icon}
                  size={20}
                  color={isActive ? '#FFFFFF' : '#64748B'}
                />
              </View>
              <Text style={isActive ? styles.tabLabelActive : styles.tabLabel}>
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
    height: 64,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 4,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.7)',
  },
  tabItem: {
    flex: 1,
    height: 56,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    backgroundColor: '#031753',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    marginBottom: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: typography.fontFamily.body,
  },
  tabLabelActive: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: typography.fontFamily.body,
  },
});
