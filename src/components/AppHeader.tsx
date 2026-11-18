import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import Constants from 'expo-constants';
import IconButton from './IconButton';
import Icon from './Icon';
import InitialsAvatar from './InitialsAvatar';
import ElderlySwitcherSheet from './ElderlySwitcherSheet';
import ContaSheet, { type OpcaoConta } from './ContaSheet';
import { colors, font, rounded, shadows, sizes } from '../theme';
import { usePapel } from '../context/PapelContext';
import { useIdoso } from '../context/IdosoContext';
import { useNomeUsuario } from '../context/UsuarioContext';

const TOP_INSET =
  Platform.OS === 'android'
    ? Math.max(StatusBar.currentHeight || 0, Constants.statusBarHeight || 0, 28) + 4
    : Platform.OS === 'ios'
      ? Math.max(Constants.statusBarHeight || 44, 44)
      : 0;

export interface AppHeaderProps {
  title?: string;
  /** Linha de contexto usada só quando não há idoso nem usuário para mostrar. */
  subtitle?: string;
  onNavigate?: (screen: string) => void;
  onPressNotification?: () => void;
  /** Ação principal do avatar (ex.: "Meus dados" no modo idoso). */
  onPressLogo?: () => void;
  hasNotification?: boolean;
  /** Saída da conta. Sem ela, o menu usa onNavigate('Logout'). */
  onLogout?: () => void;
}

/**
 * Header das telas logadas (versão B1 compacta):
 * siglas coloridas do usuário à esquerda (menu da conta), contexto + título no centro
 * ("Cuidando de <idoso> ⌄" abre o seletor de idoso para o familiar) e notificações à direita.
 */
export default function AppHeader({
  title = 'Início',
  subtitle,
  onNavigate,
  onPressNotification,
  onPressLogo,
  hasNotification = false,
  onLogout,
}: AppHeaderProps) {
  const papel = usePapel();
  const nomeUsuario = useNomeUsuario();
  const { nomeIdoso } = useIdoso();
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [contaAberta, setContaAberta] = useState(false);

  const podeTrocarIdoso = papel === 'FAMILIAR';
  const primeiroNome = (nomeUsuario ?? '').trim().split(/\s+/)[0];

  const sair = onLogout ?? (onNavigate ? () => onNavigate('Logout') : undefined);

  const opcoesConta: OpcaoConta[] = [];
  if (onPressLogo) {
    opcoesConta.push({ id: 'meus-dados', rotulo: 'Meus dados', icone: 'person', onPress: onPressLogo });
  } else if (papel === 'FAMILIAR' && onNavigate) {
    opcoesConta.push({
      id: 'perfil-idoso',
      rotulo: 'Perfil do idoso',
      icone: 'person',
      onPress: () => onNavigate('ElderlyProfile'),
    });
  }
  if (onNavigate) {
    opcoesConta.push({
      id: 'excluir-conta',
      rotulo: 'Excluir conta',
      icone: 'delete',
      destrutiva: true,
      onPress: () => onNavigate('DeleteAccount'),
    });
  }
  const temMenuConta = opcoesConta.length > 0 || Boolean(sair);

  // O sino só aparece quando leva a algum lugar; sem destino não há o que mostrar.
  const abrirNotificacoes =
    onPressNotification ?? (papel === 'FAMILIAR' && onNavigate ? () => onNavigate('Alerts') : undefined);

  const contexto = podeTrocarIdoso ? (
    <View style={styles.contextRow}>
      <Text style={styles.contextText} numberOfLines={1}>
        {nomeIdoso ? 'Cuidando de ' : 'Escolha quem acompanhar'}
        {nomeIdoso ? <Text style={styles.contextNome}>{nomeIdoso}</Text> : null}
      </Text>
      <Icon name="keyboard_arrow_down" size={18} color={colors.primary} />
    </View>
  ) : primeiroNome && papel === 'IDOSO' ? (
    <Text style={styles.contextText} numberOfLines={1}>
      Olá, {primeiroNome}
    </Text>
  ) : subtitle ? (
    <Text style={styles.contextText} numberOfLines={1}>
      {subtitle}
    </Text>
  ) : null;

  const centro = (
    <>
      {contexto}
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
    </>
  );

  return (
    <View style={styles.safeAreaHeader}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => setContaAberta(true)}
          disabled={!temMenuConta}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={nomeUsuario ? `Conta de ${nomeUsuario}` : 'Sua conta'}
          testID="header-avatar"
        >
          <InitialsAvatar nome={nomeUsuario} />
        </TouchableOpacity>

        {podeTrocarIdoso ? (
          <TouchableOpacity
            style={styles.center}
            onPress={() => setSeletorAberto(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={nomeIdoso ? `Trocar idoso. Acompanhando ${nomeIdoso}` : 'Escolher idoso'}
          >
            {centro}
          </TouchableOpacity>
        ) : (
          <View style={styles.center}>{centro}</View>
        )}

        {abrirNotificacoes ? (
          <View>
            <IconButton
              icon="notifications"
              variant="neutral"
              accessibilityLabel={hasNotification ? 'Notificações, há novos alertas' : 'Notificações'}
              onPress={abrirNotificacoes}
            />
            {hasNotification && <View style={styles.notificationDot} pointerEvents="none" />}
          </View>
        ) : null}
      </View>

      <ContaSheet
        visible={contaAberta}
        onClose={() => setContaAberta(false)}
        nomeUsuario={nomeUsuario}
        opcoes={opcoesConta}
        onSair={sair}
      />

      {podeTrocarIdoso ? (
        <ElderlySwitcherSheet
          visible={seletorAberto}
          onClose={() => setSeletorAberto(false)}
          onCadastrar={onNavigate ? () => onNavigate('RegisterElderly') : undefined}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeAreaHeader: {
    backgroundColor: colors.surface,
    paddingTop: TOP_INSET,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderBottomLeftRadius: rounded.xl,
    borderBottomRightRadius: rounded.xl,
    ...shadows.tier1,
    zIndex: 20,
  },
  headerContainer: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  center: {
    flex: 1,
    minHeight: sizes.touchMin,
    justifyContent: 'center',
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextText: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textSecondary,
    ...font('body', 500),
  },
  contextNome: {
    color: colors.primary,
    ...font('body', 600),
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: colors.primary,
    ...font('heading', 700),
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: rounded.full,
    backgroundColor: colors.coralDark,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
});
