import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Icon from '../components/Icon';
import { typography } from '../theme';

export default function TwoFactorAuthScreen({ onNavigate }) {
  const [digits, setDigits] = useState(['4', '8', '2']);
  const [secondsLeft, setSecondsLeft] = useState(32);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 32));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleKeyPress = (num) => {
    if (digits.length < 6) {
      setDigits([...digits, String(num)]);
    }
  };

  const handleBackspace = () => {
    if (digits.length > 0) {
      setDigits(digits.slice(0, -1));
    }
  };

  const handleBiometrics = () => {
    setDigits(['4', '8', '2', '9', '1', '5']);
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
            <Icon name="shield_check" size={14} color="#003B26" />
            <Text style={styles.safeAccessText}>Acesso Seguro</Text>
          </View>
          <View style={styles.avatarContainer}>
            <Icon name="person" size={20} color="#031753" />
          </View>
        </View>

        {/* TÍTULO & CONTEXTO */}
        <View style={styles.contextBlock}>
          <View style={styles.stepPill}>
            <Icon name="lock" size={13} color="#031753" />
            <Text style={styles.stepPillText}>
              Passo 2 de 2 • Proteção Familiar
            </Text>
          </View>

          <Text style={styles.title}>Código de Verificação</Text>
          <Text style={styles.subtitle}>
            Enviamos um código de 6 dígitos para o seu celular{' '}
            <Text style={styles.phoneHighlight}>(11) 9****-8910</Text> para
            proteger os dados de saúde.
          </Text>
        </View>

        {/* CARD PRINCIPAL DE 6 DÍGITOS (rx=32) */}
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
              <Icon name="schedule" size={14} color="#525B70" />
              <Text style={styles.resendTimerLabel}>Reenviar código em </Text>
              <Text style={styles.resendTimerValue}>{formattedTime}</Text>
            </View>

            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Outro Método',
                  'Código enviado via WhatsApp para (11) 9****-8910.'
                )
              }
            >
              <Text style={styles.altMethodLink}>
                Tentar outro método (WhatsApp ou Ligação)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TECLADO NUMÉRICO TÁTIL (rx=32) */}
        <View style={styles.keypadCard}>
          {keypadRows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keypadRow}>
              {row.map((key) => (
                <TouchableOpacity
                  key={key.num}
                  style={styles.keyButton}
                  onPress={() => handleKeyPress(key.num)}
                  activeOpacity={0.7}
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
              activeOpacity={0.75}
            >
              <Icon name="fingerprint" size={24} color="#031753" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.keyButton}
              onPress={() => handleKeyPress('0')}
              activeOpacity={0.7}
            >
              <Text style={styles.keyNumber}>0</Text>
              <Text style={styles.keySubText}>+</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.keyButton, styles.keyButtonBackspace]}
              onPress={handleBackspace}
              activeOpacity={0.75}
            >
              <Icon name="backspace" size={20} color="#B51C13" />
            </TouchableOpacity>
          </View>
        </View>

        {/* BOTÃO PRIMÁRIO: VALIDAR E ACESSAR */}
        <TouchableOpacity
          style={styles.validateButton}
          onPress={() => onNavigate('ElderlyMode')}
          activeOpacity={0.85}
        >
          <Text style={styles.validateButtonText}>Validar e Acessar</Text>
          <Icon name="arrow_forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* CARD DE CONFORMIDADE LGPD (#E8F8F0) */}
        <View style={styles.lgpdCard}>
          <View style={styles.lgpdIconCircle}>
            <Icon name="shield_check" size={18} color="#003B26" />
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
    backgroundColor: '#E8F8F0',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
    gap: 6,
  },
  safeAccessText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003B26',
    fontFamily: typography.fontFamily.heading,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 2,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  contextBlock: {
    marginBottom: 20,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EBF5FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    gap: 6,
    marginBottom: 12,
  },
  stepPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#031753',
    fontFamily: typography.fontFamily.heading,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A285A',
    marginBottom: 8,
    fontFamily: typography.fontFamily.heading,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#525B70',
    lineHeight: 22,
    fontFamily: typography.fontFamily.body,
  },
  phoneHighlight: {
    fontWeight: '700',
    color: '#131E3D',
  },
  codeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  codeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  codeCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#525B70',
    fontFamily: typography.fontFamily.heading,
  },
  smsActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  smsActiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    fontFamily: typography.fontFamily.heading,
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
    borderRadius: 16,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  digitBoxActive: {
    backgroundColor: '#FFEBE7',
  },
  digitText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#031753',
    fontFamily: typography.fontFamily.heading,
  },
  activeBoxDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D83729',
  },
  activeBoxUnderline: {
    position: 'absolute',
    bottom: 8,
    width: 20,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#D83729',
  },
  resendSection: {
    alignItems: 'center',
    gap: 12,
  },
  resendTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 9999,
    gap: 6,
  },
  resendTimerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#525B70',
    fontFamily: typography.fontFamily.body,
  },
  resendTimerValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#031753',
    fontFamily: typography.fontFamily.heading,
  },
  altMethodLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D83729',
    fontFamily: typography.fontFamily.heading,
  },
  keypadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 16,
    gap: 10,
    marginBottom: 20,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 10,
  },
  keyButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyButtonBio: {
    backgroundColor: '#EBF5FF',
  },
  keyButtonBackspace: {
    backgroundColor: '#FFF1EC',
  },
  keyNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#131E3D',
    lineHeight: 24,
    fontFamily: typography.fontFamily.heading,
  },
  keySubText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#525B70',
    marginTop: 1,
    fontFamily: typography.fontFamily.heading,
  },
  validateButton: {
    width: '100%',
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D83729',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
    shadowColor: '#D83729',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  validateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily.heading,
  },
  lgpdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    borderRadius: 24,
    padding: 14,
    gap: 12,
  },
  lgpdIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lgpdTextCol: {
    flex: 1,
  },
  lgpdTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003B26',
    marginBottom: 2,
    fontFamily: typography.fontFamily.heading,
  },
  lgpdSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#003B26',
    fontFamily: typography.fontFamily.body,
  },
});
