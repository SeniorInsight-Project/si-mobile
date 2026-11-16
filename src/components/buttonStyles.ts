import { colors, rounded, shadows, sizes } from '../theme/index';

/**
 * Regras de variantes do Button (§2 do plano de padronização visual):
 * - primary: ação principal da tela (CTAs de Login, Onboarding, salvar, convidar, Novo remédio).
 * - secondary: ação secundária ou neutra de apoio (ex.: Cancelar em modais).
 * - outline: ação secundária com contorno (ex.: controles auxiliares ou cancelar no SOS).
 * - ghost: links de texto e ações terciárias de baixo peso visual (altura mínima 48 dp).
 * - danger: ações destrutivas (excluir, cancelar convite, rejeitar) — nunca usar coral.
 * - sos: exclusivamente para urgência, SOS e alerta crítico (coralDark + sombra coral).
 * - success: exclusivamente para fluxos do Modo Idoso e confirmação de dose tomada ("Tomei").
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'sos'
  | 'success';

export type ButtonSize = 'md' | 'lg' | 'xl';

export interface ResolveButtonStyleInput {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
}

export interface ResolvedButtonStyle {
  variant: ButtonVariant;
  size: ButtonSize;
  backgroundColor: string;
  textColor: string;
  borderColor?: string;
  borderWidth: number;
  height: number;
  minHeight: number;
  borderRadius: number;
  fontSize: number;
  iconSize: number;
  opacity: number;
  width?: '100%';
  shadow: typeof shadows.tier0;
}

const VARIANT_COLORS: Record<
  ButtonVariant,
  {
    backgroundColor: string;
    textColor: string;
    borderColor?: string;
    borderWidth: number;
    shadow: typeof shadows.tier0;
  }
> = {
  primary: {
    backgroundColor: colors.primary,
    textColor: colors.white,
    borderWidth: 0,
    shadow: shadows.tier0,
  },
  secondary: {
    backgroundColor: colors.surfaceSubtle,
    textColor: colors.primary,
    borderWidth: 0,
    shadow: shadows.tier0,
  },
  outline: {
    backgroundColor: 'transparent',
    textColor: colors.primary,
    borderColor: colors.border,
    borderWidth: 1.5,
    shadow: shadows.tier0,
  },
  ghost: {
    backgroundColor: 'transparent',
    textColor: colors.primary,
    borderWidth: 0,
    shadow: shadows.tier0,
  },
  danger: {
    backgroundColor: colors.error,
    textColor: colors.white,
    borderWidth: 0,
    shadow: shadows.tier0,
  },
  sos: {
    backgroundColor: colors.coralDark,
    textColor: colors.white,
    borderWidth: 0,
    shadow: shadows.sos,
  },
  success: {
    backgroundColor: colors.successDark,
    textColor: colors.white,
    borderWidth: 0,
    shadow: shadows.tier0,
  },
};

export function resolveButtonStyle({
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = true,
}: ResolveButtonStyleInput = {}): ResolvedButtonStyle {
  const palette = VARIANT_COLORS[variant];
  const baseHeight = sizes.button[size];
  const height = variant === 'ghost' && size === 'md' ? sizes.touchMin : baseHeight;

  return {
    variant,
    size,
    backgroundColor: palette.backgroundColor,
    textColor: palette.textColor,
    borderColor: palette.borderColor,
    borderWidth: palette.borderWidth,
    height,
    minHeight: sizes.touchMin,
    borderRadius: rounded.full,
    fontSize: size === 'xl' ? 18 : 16,
    iconSize: size === 'xl' ? 24 : 20,
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
    shadow: palette.shadow,
  };
}
