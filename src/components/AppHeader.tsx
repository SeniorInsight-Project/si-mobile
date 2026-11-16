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
import IconButton from './IconButton';
import { colors, font, rounded, shadows, sizes, typography } from '../theme';
import { usePapel } from '../context/PapelContext';

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
  /** Quando informado, mostra o botão de sair da conta. */
  onLogout?: () => void;
}

/**
 * Header Padronizado do SeniorInsight para as telas logadas.
 */
export default function AppHeader({
  title = 'Início Monitoramento',
  subtitle = 'CUIDADO ATIVO',
  onNavigate,
  onPressNotification,
  onPressLogo,
  hasNotification = true,
  onLogout,
}: AppHeaderProps) {
  const handleLogoutPress = () => {
    if (!onLogout) return;
    if (Platform.OS === 'web') {
      onLogout();
      return;
    }
    Alert.alert('Sair da conta', 'Deseja sair? Os dados salvos neste aparelho serão apagados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: onLogout },
    ]);
  };

  const papel = usePapel();
  const handleNotificationPress = () => {
    if (onPressNotification) {
      onPressNotification();
    } else if (papel === 'FAMILIAR' && onNavigate) {
      onNavigate('Alerts');
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
        <View style={styles.leftTitleContainer}>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.rightActionsRow}>
          <View style={styles.notificationWrapper}>
            <IconButton
              icon="notifications"
              variant="neutral"
              accessibilityLabel="Notificações"
              onPress={handleNotificationPress}
            />
            {hasNotification && <View style={styles.notificationDot} pointerEvents="none" />}
          </View>

          {onLogout ? (
            <IconButton
              icon="logout"
              variant="neutral"
              accessibilityLabel="Sair da conta"
              onPress={handleLogoutPress}
            />
          ) : null}

          <TouchableOpacity
            style={styles.logoButton}
            onPress={handleLogoPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Perfil do idoso"
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
    backgroundColor: colors.surface,
    paddingTop: TOP_INSET,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.tier1,
    zIndex: 20,
  },
  headerContainer: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
  },
  leftTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 12,
  },
  headerSubtitle: {
    ...typography.labelSm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationWrapper: {
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: rounded.full,
    backgroundColor: colors.coralDark,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  logoButton: {
    width: sizes.iconButton,
    height: sizes.iconButton,
    minWidth: sizes.touchMin,
    minHeight: sizes.touchMin,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: rounded.full,
  },
});
