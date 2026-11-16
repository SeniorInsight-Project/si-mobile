import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import IconButton from './IconButton';
import { colors, font, rounded, sizes } from '../theme';

function getComorbidityTheme(name = '') {
  const lower = name.toLowerCase();

  // Cardíaco / Pressão -> Peach
  if (
    lower.includes('hipertens') ||
    lower.includes('press') ||
    lower.includes('card') ||
    lower.includes('coraç')
  ) {
    return {
      icon: 'favorite',
      bgColor: colors.peach.background,
      textColor: colors.peach.text,
    };
  }

  // Diabetes / Glicemia -> Info/Primary
  if (
    lower.includes('diabet') ||
    lower.includes('glicem') ||
    lower.includes('insul') ||
    lower.includes('rim')
  ) {
    return {
      icon: 'water_drop',
      bgColor: colors.infoSurface,
      textColor: colors.primary,
    };
  }

  // Mobilidade / Osteoporose -> Mint
  if (
    lower.includes('osteo') ||
    lower.includes('artr') ||
    lower.includes('coluna') ||
    lower.includes('reumat') ||
    lower.includes('mobilidade')
  ) {
    return {
      icon: 'walk',
      bgColor: colors.mint.background,
      textColor: colors.mint.textDark,
    };
  }

  // Alergias / Alertas -> Lavender
  if (
    lower.includes('alerg') ||
    lower.includes('asma') ||
    lower.includes('rinite') ||
    lower.includes('bronq')
  ) {
    return {
      icon: 'shield_alert',
      bgColor: colors.lavender.background,
      textColor: colors.lavender.textDark,
    };
  }

  // Padrão / Outros -> Amber
  return {
    icon: 'vital_signs',
    bgColor: colors.amber.background,
    textColor: colors.amber.textDark,
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
        <Icon name={theme.icon} size={16} color={theme.textColor} />
      </View>

      <Text
        style={[styles.chipText, { color: theme.textColor }]}
        numberOfLines={1}
      >
        {name}
      </Text>

      {onRemove && (
        <IconButton
          icon="close"
          variant="ghost"
          iconSize={16}
          accessibilityLabel={`Remover ${name}`}
          onPress={() => onRemove(name)}
          disabled={disabled}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: sizes.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 4,
    borderRadius: rounded.full,
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
    fontSize: 14,
    ...font('heading', 700),
  },
});
