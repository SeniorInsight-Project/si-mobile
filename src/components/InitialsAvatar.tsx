import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { font, rounded, sizes } from '../theme';
import { corDoAvatar, iniciaisDoNome } from '../theme/avatar';

/**
 * Avatar com as siglas do nome em pastel funcional (mesma regra de cor em todo o app).
 * Tamanho padrão 48 dp (alvo de toque mínimo quando o avatar é clicável).
 */
export interface InitialsAvatarProps {
  nome?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function InitialsAvatar({ nome, size = sizes.touchMin, style }: InitialsAvatarProps) {
  const cor = corDoAvatar(nome);
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, backgroundColor: cor.background, borderColor: cor.border },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.text, { color: cor.text, fontSize: size >= 40 ? 16 : 14 }]}>
        {iniciaisDoNome(nome)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: rounded.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...font('heading', 700),
  },
});
