import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Activity, Pill, Siren, Users } from 'lucide-react-native';

export default function BottomNavBar({ currentScreen, onNavigate }) {
  const tabs = [
    { id: 'Home', label: 'Início', icon: Activity },
    { id: 'Medicines', label: 'Remédios', icon: Pill },
    { id: 'ElderlyMode', label: 'SOS Idoso', icon: Siren },
    { id: 'Family', label: 'Família', icon: Users },
  ];

  return (
    <View style={styles.bottomTabNav}>
      {tabs.map((tab) => {
        const isActive = currentScreen === tab.id;
        const IconComponent = tab.icon;

        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, isActive && styles.tabItemActive]}
            onPress={() => onNavigate && onNavigate(tab.id)}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <IconComponent
                size={20}
                color={isActive ? '#FFFFFF' : '#64748B'}
                strokeWidth={isActive ? 2.4 : 2}
              />
            </View>
            <Text style={isActive ? styles.tabLabelActive : styles.tabLabel}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomTabNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 70,
  },
  iconContainer: {
    marginBottom: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  tabItemActive: {
    backgroundColor: '#031753', // Azul marinho escuro padrão do template
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tabLabelActive: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});