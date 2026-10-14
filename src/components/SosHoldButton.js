import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  Vibration,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Icon from './Icon';
import { colors, typography, shadows } from '../theme';

const HOLD_DURATION_MS = 2000; // 2 segundos conforme HU-063 / RN-009
const BUTTON_SIZE = 196;
const SVG_SIZE = 224;
const STROKE_WIDTH = 7;
const RADIUS = (SVG_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function SosHoldButton({ onTrigger, disabled = false }) {
  const [isPressing, setIsPressing] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(2);
  const [dashOffset, setDashOffset] = useState(CIRCUMFERENCE);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);
  const tickTimerRef = useRef(null);
  const isCompletedRef = useRef(false);

  // Escuta o progresso animado para atualizar o anel SVG de forma fluida e compatível
  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      const offset = CIRCUMFERENCE * (1 - value);
      setDashOffset(offset);
      const remaining = Math.max(1, Math.ceil((1 - value) * 2));
      setCountdownSeconds(remaining);
    });

    return () => {
      progressAnim.removeListener(listenerId);
    };
  }, [progressAnim]);

  const triggerHaptic = async (tipo) => {
    if (Platform.OS === 'web') return;
    try {
      if (tipo === 'start') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (tipo === 'tick') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (tipo === 'success') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (tipo === 'cancel') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      // Fallback para Vibration do React Native
      if (tipo === 'start') Vibration.vibrate(60);
      else if (tipo === 'success') Vibration.vibrate([0, 200, 80, 250]);
    }
  };

  const handlePressIn = () => {
    if (disabled) return;

    isCompletedRef.current = false;
    setIsPressing(true);
    triggerHaptic('start');

    // Timer intermediário aos 1s para feedback tátil contínuo
    tickTimerRef.current = setTimeout(() => {
      if (!isCompletedRef.current) {
        triggerHaptic('tick');
      }
    }, 1000);

    // Inicia a animação linear de 0 a 1 em exatamente 2 segundos
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: HOLD_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !isCompletedRef.current) {
        isCompletedRef.current = true;
        setIsPressing(false);
        triggerHaptic('success');
        if (onTrigger) {
          onTrigger();
        }
        // Reseta o progresso após o disparo
        progressAnim.setValue(0);
      }
    });
  };

  const handlePressOut = () => {
    if (isCompletedRef.current) return;

    // Cenário 2 (toque curto): soltou antes dos 2 segundos -> recua o anel suavemente
    setIsPressing(false);
    triggerHaptic('cancel');

    if (tickTimerRef.current) {
      clearTimeout(tickTimerRef.current);
      tickTimerRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Para a animação atual e faz o anel recuar suavemente até 0
    progressAnim.stopAnimation();
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonWrapper}>
        {/* Anel SVG de Progresso Circular */}
        <Svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          style={styles.svgOverlay}
        >
          {/* Trilha de fundo (cinza/coral translúcido) */}
          <Circle
            cx={SVG_SIZE / 2}
            cy={SVG_SIZE / 2}
            r={RADIUS}
            stroke={isPressing ? 'rgba(181, 28, 19, 0.15)' : 'rgba(203, 213, 225, 0.4)'}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Anel de progresso ativo que completa em 2 segundos */}
          <Circle
            cx={SVG_SIZE / 2}
            cy={SVG_SIZE / 2}
            r={RADIUS}
            stroke="#B51C13"
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${SVG_SIZE / 2} ${SVG_SIZE / 2})`}
          />
        </Svg>

        {/* Botão Central de Emergência */}
        <TouchableOpacity
          style={[
            styles.innerButton,
            isPressing && styles.innerButtonPressing,
            disabled && styles.innerButtonDisabled,
          ]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.92}
          accessible={true}
          accessibilityLabel="Botão de Emergência"
          accessibilityHint="Pressione e segure por dois segundos para chamar sua família imediatamente"
          accessibilityRole="button"
        >
          <Text style={styles.mainText}>EMERGÊNCIA</Text>

          {isPressing && (
            <View style={styles.pressingOverlay}>
              <Text style={styles.countdownNumber}>{countdownSeconds}</Text>
              <Text style={styles.countdownLabel}>segure firme...</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Instruções do botão atualizadas para 2 segundos conforme HU-063 / RN-009 */}
      <View style={styles.instructionRow}>
        <Icon name="touch_app" size={18} color="#B51C13" />
        <Text style={styles.instructionText}>
          {isPressing
            ? `Segure por mais ${countdownSeconds}s para acionar!`
            : 'Pressione e segure por 2 segundos'}
        </Text>
      </View>

      <Text style={styles.footerSubText}>
        Avisará imediatamente sua família e enviará sua localização em tempo real.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonWrapper: {
    width: SVG_SIZE,
    height: SVG_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 12,
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  innerButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#B51C13',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.tier3,
    borderWidth: 4,
    borderColor: '#FEE2E2',
    elevation: 8,
    paddingHorizontal: 16,
  },
  innerButtonPressing: {
    backgroundColor: '#8C120A',
    transform: [{ scale: 0.97 }],
  },
  innerButtonDisabled: {
    backgroundColor: '#94A3B8',
    borderColor: '#E2E8F0',
  },
  mainText: {
    ...typography.titleLarge,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 22,
    textAlign: 'center',
  },
  overlayEmergenciaText: {
    ...typography.labelMedium,
    color: '#FEE2E2',
    fontWeight: '800',
    letterSpacing: 2,
    fontSize: 13,
    marginBottom: 2,
  },
  pressingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(140, 18, 10, 0.94)',
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumber: {
    ...typography.displayMedium,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 48,
    lineHeight: 52,
  },
  countdownLabel: {
    ...typography.labelMedium,
    color: '#FECACA',
    fontWeight: '700',
    marginTop: 2,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  instructionText: {
    ...typography.bodyMedium,
    color: '#B51C13',
    fontWeight: '700',
    fontSize: 15,
  },
  footerSubText: {
    ...typography.bodySmall,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
    marginTop: 2,
  },
});
