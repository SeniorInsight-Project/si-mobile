import React from 'react';
import { View, StyleSheet, Platform, StatusBar, StyleProp, ViewStyle } from 'react-native';
import Constants from 'expo-constants';
import { colors } from '../theme';

const TOP_SAFE_INSET =
  Platform.OS === 'android'
    ? Math.max(StatusBar.currentHeight || 0, Constants.statusBarHeight || 0, 28) + 8
    : Platform.OS === 'ios'
      ? Math.max(Constants.statusBarHeight || 44, 44)
      : 0;

// RN 0.88 (SDK 58): o Android é sempre edge-to-edge, a barra de status fica translúcida
// sobre o fundo da tela; backgroundColor/translucent do StatusBar não existem mais.
export interface ScreenWrapperProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  hasHeader?: boolean;
}

export default function ScreenWrapper({
  children,
  style,
  hasHeader = true,
}: ScreenWrapperProps) {
  if (!hasHeader) {
    return (
      <View style={[styles.containerNoHeader, style]}>
        <StatusBar barStyle="dark-content" />
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.containerWithHeader, style]}>
      <StatusBar barStyle="dark-content" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  containerWithHeader: {
    flex: 1,
    backgroundColor: colors.canvasBase,
  },
  containerNoHeader: {
    flex: 1,
    backgroundColor: colors.canvasBase,
    paddingTop: TOP_SAFE_INSET,
  },
});
