import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { Heart, Bell, ArrowLeft } from 'lucide-react-native';

/**
 * Header Padronizado do SeniorInsight para todas as telas do aplicativo.
 * Garante consistência visual estrita de altura, cores, tipografia e ícones.
 */
export default function AppHeader({
  title = 'SeniorInsight',
  subtitle = 'CUIDADO ATIVO',
  isBack = false,
  onBack,
  onNavigate,
  onPressHeart,
  onPressNotification,
  onPressLogo,
  hasNotification = true,
}) {
  const handleHeartPress = () => {
    if (onPressHeart) {
      onPressHeart();
    } else if (onNavigate) {
      onNavigate('Home');
    }
  };

  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('ElderlyMode');
    }
  };

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
    <View style={styles.headerContainer}>
      {/* Botão Esquerdo (Voltar ou Coração) */}
      {isBack ? (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleBackPress}
          activeOpacity={0.8}
        >
          <ArrowLeft size={18} color="#031753" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleHeartPress}
          activeOpacity={0.8}
        >
          <Heart size={18} color="#031753" />
        </TouchableOpacity>
      )}

      {/* Título e Subtítulo Centralizados */}
      <View style={styles.centerTitleContainer}>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Botões da Direita (Notificação e Logo) */}
      <View style={styles.rightActionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleNotificationPress}
          activeOpacity={0.8}
        >
          <Bell size={18} color="#031753" />
          {hasNotification && <View style={styles.notificationDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { marginLeft: 8 }]}
          onPress={handleLogoPress}
          activeOpacity={0.8}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  logoImage: {
    width: 22,
    height: 22,
  },
  centerTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#031753',
    textAlign: 'center',
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
