import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import { typography } from '../theme';

function getComorbidityTheme(name = '') {
  const lower = name.toLowerCase();

  // Cardíaco / Pressão -> Coral (#FFEBE7)
  if (
    lower.includes('hipertens') ||
    lower.includes('press') ||
    lower.includes('card') ||
    lower.includes('coraç')
  ) {
    return {
      icon: 'favorite',
      bgColor: '#FFEBE7',
      textColor: '#B51C13',
      closeColor: '#B51C13',
    };
  }

  // Diabetes / Glicemia -> Sky (#EBF5FF)
  if (
    lower.includes('diabet') ||
    lower.includes('glicem') ||
    lower.includes('insul') ||
    lower.includes('rim')
  ) {
    return {
      icon: 'water_drop',
      bgColor: '#EBF5FF',
      textColor: '#031753',
      closeColor: '#031753',
    };
  }

  // Mobilidade / Osteoporose -> Mint (#E8F8F0)
  if (
    lower.includes('osteo') ||
    lower.includes('artr') ||
    lower.includes('coluna') ||
    lower.includes('reumat') ||
    lower.includes('mobilidade')
  ) {
    return {
      icon: 'walk',
      bgColor: '#E8F8F0',
      textColor: '#003B26',
      closeColor: '#003B26',
    };
  }

  // Alergias / Alertas -> Lavender (#F3EEFF)
  if (
    lower.includes('alerg') ||
    lower.includes('asma') ||
    lower.includes('rinite') ||
    lower.includes('bronq')
  ) {
    return {
      icon: 'shield_alert',
      bgColor: '#F3EEFF',
      textColor: '#5B21B6',
      closeColor: '#5B21B6',
    };
  }

  // Padrão / Outros -> Peach (#FFF1EC)
  return {
    icon: 'vital_signs',
    bgColor: '#FFF1EC',
    textColor: '#9A3412',
    closeColor: '#9A3412',
  };
}

export interface ComorbidityChipProps {
  name: string;
  onRemove?: (name: string) => void;
  disabled?: boolean;
}

export default function ComorbidityChip({
  name,
  onRemove,
  disabled = false,
}: ComorbidityChipProps) {
  const theme = getComorbidityTheme(name);

  return (
    <View style={[styles.chip, { backgroundColor: theme.bgColor }]}>
      <View style={styles.iconContainer}>
        <Icon name={theme.icon} size={15} color={theme.textColor} />
      </View>

      <Text
        style={[styles.chipText, { color: theme.textColor }]}
        numberOfLines={1}
      >
        {name}
      </Text>

      {onRemove && (
        <TouchableOpacity
          onPress={() => onRemove(name)}
          style={styles.closeButton}
          activeOpacity={0.75}
          disabled={disabled}
        >
          <Icon name="close" size={12} color={theme.closeColor} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 9999,
    marginRight: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
  },
  closeButton: {
    marginLeft: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
