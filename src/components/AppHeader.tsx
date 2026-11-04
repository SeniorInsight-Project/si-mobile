import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import Constants from 'expo-constants';
import Icon from './Icon';
import { typography, shadows } from '../theme';

const TOP_INSET =
  Platform.OS === 'android'
    ? Math.max(StatusBar.currentHeight || 0, Constants.statusBarHeight || 0, 28) + 4
    : Platform.OS === 'ios'
      ? Math.max(Constants.statusBarHeight || 44, 44)
      : 0;

export interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  onNavigate?: (screen: string) => void;
  onPressNotification?: () => void;
  onPressLogo?: () => void;
  hasNotification?: boolean;
}

/**
 * Header Padronizado do SeniorInsight para as telas logadas.
 * - Preenche continuamente até o topo físico da tela (Safe Area / Status Bar).
 * - Sem botões de coração ou voltar.
 * - Alinhado às especificações do Senior APP(2).fig.
 */
export default function AppHeader({
  title = 'Início Monitoramento',
  subtitle = 'CUIDADO ATIVO',
  onNavigate,
  onPressNotification,
  onPressLogo,
  hasNotification = true,
}: AppHeaderProps) {
  const handleNotificationPress = () => {
    if (onPressNotification) {
      onPressNotification();
    } else {
      Alert.alert('Notificações', 'Sem novos alertas críticos no momento.');
    }
  };

  const handleLogoPress = () => {
    if (onPressLogo) {
      onPressLogo();
    } else if (onNavigate) {
      onNavigate('ElderlyProfile');
    }
  };

  return (
    <View style={styles.safeAreaHeader}>
      <View style={styles.headerContainer}>
        {/* Subtítulo e Título alinhados à esquerda conforme o .fig (sem coração/voltar) */}
        <View style={styles.leftTitleContainer}>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Botões da Direita (Notificação 44x44 + Logo Circular 36x36) */}
        <View style={styles.rightActionsRow}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={handleNotificationPress}
            activeOpacity={0.75}
          >
            <Icon name="notifications" size={20} color="#031753" />
            {hasNotification && <View style={styles.notificationDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoButton}
            onPress={handleLogoPress}
            activeOpacity={0.75}
          >
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeAreaHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: TOP_INSET,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...shadows.tier1,
    zIndex: 20,
  },
  headerContainer: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  leftTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 12,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
    fontFamily: typography.fontFamily.heading,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#B51C13',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  logoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
