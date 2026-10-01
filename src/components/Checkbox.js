import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';

export default function Checkbox({ isChecked, onToggle, children }) {
  return (
    <TouchableOpacity style={styles.container} onPress={onToggle} activeOpacity={0.8}>
      <View style={[styles.box, isChecked && styles.boxChecked]}>
        {isChecked && <Check size={14} color="#FFFFFF" strokeWidth={3.5} />}
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
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 2,
  },
  boxChecked: {
    backgroundColor: '#E5534B',
    borderColor: '#E5534B',
  },
  textContainer: {
    flex: 1,
  },
});