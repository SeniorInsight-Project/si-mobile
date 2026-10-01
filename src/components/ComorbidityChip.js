import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Heart, Droplet, UserCheck, AlertTriangle, Activity, X } from 'lucide-react-native';

/**
 * Mapeia dinamicamente cores e ícones Lucide conforme o tipo de comorbidade.
 */
function getComorbidityTheme(name = '') {
  const lower = name.toLowerCase();

  if (lower.includes('hipertens') || lower.includes('press') || lower.includes('card') || lower.includes('coraç')) {
    return {
      icon: Heart,
      bgColor: '#FEE2E2',
      borderColor: '#FECACA',
      textColor: '#991B1B',
      closeColor: '#B91C1C',
    };
  }

  if (lower.includes('diabet') || lower.includes('glicem') || lower.includes('insul') || lower.includes('rim')) {
    return {
      icon: Droplet,
      bgColor: '#E0F2FE',
      borderColor: '#BAE6FD',
      textColor: '#0369A1',
      closeColor: '#0284C7',
    };
  }

  if (lower.includes('osteo') || lower.includes('artr') || lower.includes('coluna') || lower.includes('reumat') || lower.includes('mobilidade')) {
    return {
      icon: UserCheck,
      bgColor: '#DCFCE7',
      borderColor: '#BBF7D0',
      textColor: '#15803D',
      closeColor: '#16A34A',
    };
  }

  if (lower.includes('alerg') || lower.includes('asma') || lower.includes('rinite') || lower.includes('bronq')) {
    return {
      icon: AlertTriangle,
      bgColor: '#F3E8FF',
      borderColor: '#E9D5FF',
      textColor: '#6B21A8',
      closeColor: '#7E22CE',
    };
  }

  return {
    icon: Activity,
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
    textColor: '#92400E',
    closeColor: '#B45309',
  };
}

export default function ComorbidityChip({ name, onRemove, disabled = false }) {
  const theme = getComorbidityTheme(name);
  const IconComponent = theme.icon;

  return (
    <View style={[styles.chipContainer, { backgroundColor: theme.bgColor, borderColor: theme.borderColor }]}>
      <View style={styles.iconWrapper}>
        <IconComponent size={14} color={theme.textColor} strokeWidth={2.4} />
      </View>
      
      <Text style={[styles.label, { color: theme.textColor }]} numberOfLines={1}>
        {name}
      </Text>

      {onRemove && (
        <TouchableOpacity
          onPress={() => onRemove(name)}
          disabled={disabled}
          style={styles.removeButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <X size={12} color={theme.closeColor} strokeWidth={2.6} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 10,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  iconWrapper: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 10,
    flexShrink: 1,
  },
  removeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
});
