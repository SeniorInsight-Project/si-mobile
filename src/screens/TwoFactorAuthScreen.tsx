import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { colors, font, rounded, shadows, typography } from '../theme';
import { mockPermitido } from '../config/ambiente';

export interface TwoFactorAuthScreenProps {
  onNavigate: (screen: string) => void;
  /** Telefone já mascarado pelo servidor, ex.: "(11) 9****-1234". Sem ele, o texto não cita número. */
  telefoneMascarado?: string | null;
}

export default function TwoFactorAuthScreen({ onNavigate, telefoneMascarado }: TwoFactorAuthScreenProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [secondsLeft, setSecondsLeft] = useState<number>(32);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 32));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleKeyPress = (num: string | number) => {
    if (digits.length < 6) {
      setDigits([...digits, String(num)]);
    }
  };

  const handleBackspace = () => {
    if (digits.length > 0) {
      setDigits(digits.slice(0, -1));
    }
  };

  // Código de demonstração só com mock permitido; fora disso a biometria não preenche nada.
  const handleBiometrics = () => {
    if (mockPermitido()) setDigits(['4', '8', '2', '9', '1', '5']);
  };

  const formattedTime = `00:${secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}`;

  const keypadRows = [
    [
      { num: '1', sub: '' },
      { num: '2', sub: 'ABC' },
      { num: '3', sub: 'DEF' },
    ],
    [
      { num: '4', sub: 'GHI' },
      { num: '5', sub: 'JKL' },
      { num: '6', sub: 'MNO' },
    ],
    [
      { num: '7', sub: 'PQRS' },
      { num: '8', sub: 'TUV' },
      { num: '9', sub: 'WXYZ' },
    ],
  ];

  return (
    <ScreenWrapper hasHeader={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* TOPO: Pílula Acesso Seguro + Avatar (sem botão voltar) */}
        <View style={styles.topHeader}>
          <View style={styles.topSpacer} />
          <View style={styles.safeAccessBadge}>
            <Icon name="shield_check" size={16} color={colors.mint.textDark} />
            <Text style={styles.safeAccessText}>Acesso Seguro</Text>
          </View>
          <View style={styles.avatarContainer}>
            <Icon name="person" size={20} color={colors.primary} />
          </View>
        </View>

        {/* TÍTULO & CONTEXTO */}
        <View style={styles.contextBlock}>
          <View style={styles.stepPill}>
            <Icon name="lock" size={14} color={colors.primary} />
            <Text style={styles.stepPillText}>
              Passo 2 de 2 • Proteção Familiar
            </Text>
          </View>

          <Text style={styles.title}>Código de Verificação</Text>
          <Text style={styles.subtitle}>
            Enviamos um código de 6 dígitos para o seu celular
            {telefoneMascarado ? (
              <>
                {' '}
                <Text style={styles.phoneHighlight}>{telefoneMascarado}</Text>
              </>
            ) : (
              ' cadastrado'
            )}{' '}
            para proteger os dados de saúde.
          </Text>
        </View>

        {/* CARD PRINCIPAL DE 6 DÍGITOS */}
        <View style={styles.codeCard}>
          <View style={styles.codeCardHeader}>
            <Text style={styles.codeCardLabel}>Digite os 6 dígitos</Text>
            <View style={styles.smsActiveRow}>
              <View style={styles.smsDot} />
              <Text style={styles.smsActiveText}>SMS Ativo</Text>
            </View>
          </View>

          {/* 6 Caixas de Dígitos */}
          <View style={styles.digitBoxesRow}>
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const val = digits[idx];
              const isActive = idx === digits.length;

              return (
                <View
                  key={idx}
                  style={[
                    styles.digitBox,
                    isActive && styles.digitBoxActive,
                  ]}
                >
                  {val ? (
                    <Text style={styles.digitText}>{val}</Text>
                  ) : isActive ? (
                    <>
                      <View style={styles.activeBoxDot} />
                      <View style={styles.activeBoxUnderline} />
                    </>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* Reenvio e Método Alternativo */}
          <View style={styles.resendSection}>
            <View style={styles.resendTimerPill}>
              <Icon name="schedule" size={16} color={colors.onSurfaceVariant} />
              <Text style={styles.resendTimerLabel}>Reenviar código em </Text>
              <Text style={styles.resendTimerValue}>{formattedTime}</Text>
            </View>

            <Button
              title="Tentar outro método (WhatsApp ou Ligação)"
              onPress={() =>
                Alert.alert(
                  'Outro Método',
                  telefoneMascarado
                    ? `Código enviado via WhatsApp para ${telefoneMascarado}.`
                    : 'Código enviado via WhatsApp para o seu celular cadastrado.'
                )
              }
              variant="ghost"
              fullWidth={false}
            />
          </View>
        </View>

        {/* TECLADO NUMÉRICO TÁTIL */}
        <View style={styles.keypadCard}>
          {keypadRows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keypadRow}>
              {row.map((key) => (
                <TouchableOpacity
                  key={key.num}
                  style={styles.keyButton}
                  onPress={() => handleKeyPress(key.num)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Dígito ${key.num}`}
                >
                  <Text style={styles.keyNumber}>{key.num}</Text>
                  {key.sub ? (
                    <Text style={styles.keySubText}>{key.sub}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Linha 4: Biometria, 0/+, Backspace */}
          <View style={styles.keypadRow}>
            <TouchableOpacity
              style={[styles.keyButton, styles.keyButtonBio]}
              onPress={handleBiometrics}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Preencher com biometria"
            >
              <Icon name="fingerprint" size={24} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleKeyPress('0')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Dígito 0"
            >
              <Text style={styles.keyNumber}>0</Text>
              <Text style={styles.keySubText}>+</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.keyButton, styles.keyButtonBackspace]}
              onPress={handleBackspace}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Apagar último dígito"
            >
              <Icon name="backspace" size={22} color={colors.coralDark} />
            </TouchableOpacity>
          </View>
        </View>

        {/* BOTÃO PRIMÁRIO: VALIDAR E ACESSAR */}
        <View style={styles.validateWrapper}>
          <Button
            title="Validar e Acessar"
            onPress={() => onNavigate('ElderlyMode')}
            variant="primary"
            size="lg"
            iconRight="arrow_forward"
          />
        </View>

        {/* CARD DE CONFORMIDADE LGPD */}
        <View style={styles.lgpdCard}>
          <View style={styles.lgpdIconCircle}>
            <Icon name="shield_check" size={18} color={colors.mint.textDark} />
          </View>
          <View style={styles.lgpdTextCol}>
            <Text style={styles.lgpdTitle}>
              Ambiente Criptografado &amp; Conforme LGPD
            </Text>
            <Text style={styles.lgpdSubtitle}>
              Seus dados familiares e prontuários estão protegidos.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  topSpacer: {
    width: 40,
  },
  safeAccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mint.background,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: rounded.full,
    gap: 6,
  },
  safeAccessText: {
    fontSize: 14,
    color: colors.mint.textDark,
    ...font('heading', 700),
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: rounded.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.tier1,
  },
  contextBlock: {
    marginBottom: 20,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.infoSurface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: rounded.full,
    gap: 6,
    marginBottom: 12,
  },
  stepPillText: {
    fontSize: 14,
    color: colors.primary,
    ...font('heading', 700),
  },
  title: {
    ...typography.headlineLg,
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
    ...font('body', 500),
  },
  phoneHighlight: {
    ...font('body', 700),
    color: colors.textPrimary,
  },
  codeCard: {
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
    padding: 20,
    marginBottom: 18,
    ...shadows.tier2,
  },
  codeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  codeCardLabel: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    ...font('heading', 700),
  },
  smsActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smsDot: {
    width: 8,
    height: 8,
    borderRadius: rounded.full,
    backgroundColor: colors.success,
  },
  smsActiveText: {
    fontSize: 14,
    color: colors.successDark,
    ...font('heading', 700),
  },
  digitBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 18,
  },
  digitBox: {
    flex: 1,
    height: 56,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  digitBoxActive: {
    backgroundColor: colors.peach.background,
  },
  digitText: {
    fontSize: 24,
    color: colors.primary,
    ...font('heading', 800),
  },
  activeBoxDot: {
    width: 10,
    height: 10,
    borderRadius: rounded.full,
    backgroundColor: colors.coralDark,
  },
  activeBoxUnderline: {
    position: 'absolute',
    bottom: 8,
    width: 20,
    height: 2.5,
    borderRadius: rounded.sm,
    backgroundColor: colors.coralDark,
  },
  resendSection: {
    alignItems: 'center',
    gap: 10,
  },
  resendTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: rounded.full,
    gap: 6,
  },
  resendTimerLabel: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    ...font('body', 600),
  },
  resendTimerValue: {
    fontSize: 14,
    color: colors.primary,
    ...font('heading', 800),
  },
  keypadCard: {
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
    padding: 16,
    gap: 10,
    marginBottom: 20,
    ...shadows.tier2,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 10,
  },
  keyButton: {
    flex: 1,
    height: 56,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyButtonBio: {
    backgroundColor: colors.infoSurface,
  },
  keyButtonBackspace: {
    backgroundColor: colors.peach.background,
  },
  keyNumber: {
    fontSize: 20,
    color: colors.textPrimary,
    lineHeight: 22,
    ...font('heading', 700),
  },
  keySubText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
    ...font('heading', 600),
  },
  validateWrapper: {
    marginBottom: 16,
  },
  lgpdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mint.background,
    borderRadius: rounded.card,
    padding: 14,
    gap: 12,
  },
  lgpdIconCircle: {
    width: 36,
    height: 36,
    borderRadius: rounded.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lgpdTextCol: {
    flex: 1,
  },
  lgpdTitle: {
    fontSize: 14,
    color: colors.mint.textDark,
    marginBottom: 2,
    ...font('heading', 700),
  },
  lgpdSubtitle: {
    fontSize: 14,
    color: colors.mint.textDark,
    ...font('body', 500),
  },
});
