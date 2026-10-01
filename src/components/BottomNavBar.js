import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function BottomNavBar({ currentScreen, onNavigate }) {
  const tabs = [
    { id: 'Home', label: 'Início', emoji: '📈' },
    { id: 'Medicines', label: 'Remédios', emoji: '💊' },
    { id: 'ElderlyMode', label: 'SOS Idoso', emoji: '🚨' },
    { id: 'Family', label: 'Família', emoji: '👥' },
  ];

  return (
    <View style={styles.bottomTabNav}>
      {tabs.map((tab) => {
        const isActive = currentScreen === tab.id;

        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, isActive && styles.tabItemActive]}
            onPress={() => onNavigate(tab.id)}
            activeOpacity={0.8}
          >
            <Text style={isActive ? styles.tabEmojiActive : styles.tabEmoji}>
              {tab.emoji}
            </Text>
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
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 24,
  },
  tabEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  tabItemActive: {
    backgroundColor: '#031753', // Fundo azul escuro para a página ativa
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 24,
  },
  tabEmojiActive: {
    fontSize: 16,
    marginBottom: 2,
  },
  tabLabelActive: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});