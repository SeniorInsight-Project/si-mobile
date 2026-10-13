import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import Icon from './Icon';
import { colors, rounded } from '../theme';

export default function Checkbox({ isChecked, onToggle, children }) {
  return (
    <TouchableOpacity style={styles.container} onPress={onToggle} activeOpacity={0.8}>
      <View style={[styles.box, isChecked && styles.boxChecked]}>
        {isChecked && <Icon name="check" size={14} color="#FFFFFF" />}
      </View>
      <View style={styles.textContainer}>
        {children}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    marginBottom: 20,
    minHeight: 48,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: rounded.sm,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginTop: 2,
  },
  boxChecked: {
    backgroundColor: colors.secondaryCoral,
    borderColor: colors.secondaryCoral,
  },
  textContainer: {
    flex: 1,
  },
});