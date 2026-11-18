import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IconButton from './IconButton';
import { colors, font, rounded, shadows } from '../theme';

/**
 * Folha inferior padrão para modais:
 * - O fundo (colors.overlay) esmaece e só a folha sobe, com raio superior rounded.sheet e shadows.tier3.
 * - Cabeçalho padronizado com título 20 px bold e IconButton 48×48 para fechar.
 * - SemaforoMotivoModal (card central) e SosActiveModal (tela cheia) têm layout próprio.
 */
export interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  dismissOnOverlay?: boolean;
}

export default function ModalSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  dismissOnOverlay = true,
}: ModalSheetProps) {
  // O Modal só esmaece (fundo); a folha entra com um deslize curto por cima.
  const entrada = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    entrada.setValue(0);
    Animated.timing(entrada, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, entrada]);
  // A folha encosta na base da tela: o conteúdo fica acima do indicador inicial do iPhone.
  const { bottom: insetInferior } = useSafeAreaInsets();
  const deslize = entrada.interpolate({ inputRange: [0, 1], outputRange: [48, 0] });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.overlay}
          onPress={dismissOnOverlay ? onClose : undefined}
          accessibilityLabel="Fechar janela"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrapper}
        >
          <Animated.View style={[styles.sheet, { opacity: entrada, transform: [{ translateY: deslize }] }]}>
            <View style={[styles.safeArea, { paddingBottom: insetInferior }]}>
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <Text style={styles.title}>{title}</Text>
                  {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>
                <IconButton
                  icon="close"
                  variant="neutral"
                  accessibilityLabel="Fechar"
                  onPress={onClose}
                />
              </View>

              <ScrollView
                style={styles.body}
                contentContainerStyle={styles.bodyContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>

              {footer ? <View style={styles.footer}>{footer}</View> : null}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // O escurecimento fica no container: um Pressable absoluto só com cor não era desenhado no Android.
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardWrapper: {
    width: '100%',
    maxHeight: '90%',
  },
  // A cadeia sheet > safeArea > body precisa encolher para caber nos 90% do keyboardWrapper;
  // sem isso o ScrollView cresce até o conteúdo inteiro e o rodapé é cortado pelo overflow.
  sheet: {
    flexShrink: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: rounded.sheet,
    borderTopRightRadius: rounded.sheet,
    ...shadows.tier3,
    overflow: 'hidden',
  },
  safeArea: {
    width: '100%',
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...font('heading', 700),
    fontSize: 20,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  subtitle: {
    ...font('body', 400),
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: 4,
  },
  body: {
    flexGrow: 0,
    flexShrink: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
