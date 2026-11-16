import type { TextStyle } from 'react-native';

/**
 * SeniorInsight Design System Tokens
 * Referência consolidada na Etapa 1 da padronização visual (planning/plano_padronizacao_visual.md).
 * Nota: DESIGN.md não existe neste repositório; até decisão em contrário, este arquivo é a fonte da verdade.
 */

export const colors = {
  // Básicos
  white: '#FFFFFF',
  black: '#000000',
  navyDark: '#0F1E36',
  coralBright: '#FF6B5B',

  /** @deprecated use colors.primary */
  navy: '#072369',
  /** @deprecated use colors.primaryNavy */
  navyLight: '#253B80',

  // Brand & Core (canônicos §2.1–2.3)
  primary: '#072369',
  primaryNavy: '#253B80',
  primaryNavyDeep: '#1E306E',
  /** @deprecated use colors.primaryNavy */
  primaryContainer: '#253B80',
  onPrimary: '#FFFFFF',

  // Secondary & Urgent (coral reservado para SOS, urgência e alertas críticos)
  coral: '#FA5D4B',
  coralDark: '#B32A1E',
  coralPressed: '#8C120A',
  /** @deprecated use colors.coralDark */
  secondary: '#B32A1E',
  /** @deprecated use colors.coral */
  secondaryCoral: '#FA5D4B',
  /** @deprecated use colors.coralBright */
  secondaryCoralBright: '#FF6B5B',
  /** @deprecated use colors.coral */
  secondaryContainer: '#FF614F',
  onSecondary: '#FFFFFF',

  // Neutrals & Surfaces
  canvasBase: '#F8FAFC',
  /** @deprecated use colors.surface */
  canvasCard: '#FFFFFF',
  background: '#FAF8FF',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F4F9',
  surfaceContainer: '#E9EDFF',
  surfaceContainerLow: '#F2F3FF',
  surfaceContainerHigh: '#E2E8FC',
  infoSurface: '#EBF5FF',
  overlay: 'rgba(7, 35, 105, 0.45)',
  disabled: '#CBD5E1',

  // Text & Content
  textPrimary: '#151B2A',
  /** @deprecated use colors.textPrimary */
  onSurface: '#151B2A',
  onSurfaceVariant: '#444651',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  /** @deprecated use colors.textMuted */
  slate400: '#94A3B8',
  /** @deprecated use colors.surfaceSubtle */
  slate100: '#F1F5F9',

  // Borders & Dividers
  border: '#E2E8F0',
  /** @deprecated use colors.border */
  borderLight: '#E2E8F0',
  outline: '#757682',
  outlineVariant: '#C5C5D2',

  // Functional Pastels (Objetos + Aliases Planos sincronizados, todos >= 4.5:1 WCAG AA sobre .background)
  mint: {
    background: '#E8F8F0',
    border: '#B8ECD3',
    // #047857 atinge 4.99:1 sobre #E8F8F0 (o anterior #059669 tinha 3.43:1, reprovado em AA)
    text: '#047857',
    textDark: '#003119',
  },
  mintBg: '#E8F8F0',
  mintBorder: '#B8ECD3',
  mintText: '#047857',

  peach: {
    background: '#FFEBE5',
    border: '#FFCDC2',
    // #991B1B atinge 7.23:1 sobre #FFEBE5 e resolve a divergência peach.text (#E11D48, 4.09:1) x peachText (#991B1B)
    text: '#991B1B',
    textDark: '#650001',
  },
  peachBg: '#FFEBE5',
  peachBorder: '#FFCDC2',
  peachText: '#991B1B',

  sky: {
    background: '#E6F3FA',
    border: '#C4E4F5',
    // #0369A1 atinge 5.25:1 sobre #E6F3FA (o anterior #0284C7 tinha 3.62:1, reprovado em AA)
    text: '#0369A1',
    textDark: '#0369A1',
  },
  skyBg: '#E6F3FA',
  skyBorder: '#C4E4F5',
  skyText: '#0369A1',

  amber: {
    background: '#FFF8E7',
    border: '#FFE8B3',
    // #92400E atinge 6.70:1 sobre #FFF8E7 (o anterior #D97706 tinha 3.01:1, reprovado em AA)
    text: '#92400E',
    textDark: '#78350F',
  },
  amberBg: '#FFF8E7',
  amberBorder: '#FFE8B3',
  amberText: '#92400E',

  lavender: {
    background: '#F0EEFC',
    border: '#D9D4F8',
    // #7C3AED atinge 4.98:1 sobre #F0EEFC (WCAG AA)
    text: '#7C3AED',
    textDark: '#4C1D95',
  },
  lavenderBg: '#F0EEFC',
  lavenderBorder: '#D9D4F8',
  lavenderText: '#7C3AED',

  // Status & Feedback
  success: '#10B981',
  // #047857 atinge 5.48:1 com texto branco (o anterior #059669 tinha 3.77:1, reprovado em AA)
  successDark: '#047857',
  warning: '#F59E0B',
  error: '#BA1A1A',
  /** @deprecated use colors.error */
  errorBright: '#DC2626',
};

export const fonts = {
  heading: {
    600: 'PlusJakartaSans_600SemiBold',
    700: 'PlusJakartaSans_700Bold',
    800: 'PlusJakartaSans_800ExtraBold',
  },
  body: {
    400: 'Inter_400Regular',
    500: 'Inter_500Medium',
    600: 'Inter_600SemiBold',
    700: 'Inter_700Bold',
  },
} as const;

export type FontKind = keyof typeof fonts;
export type HeadingFontWeight = keyof typeof fonts.heading;
export type BodyFontWeight = keyof typeof fonts.body;
export type FontWeightInput =
  | HeadingFontWeight
  | BodyFontWeight
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | 'normal'
  | 'regular'
  | 'medium'
  | 'semibold'
  | 'bold';

export function font(
  kind: FontKind,
  weight: FontWeightInput = kind === 'heading' ? 700 : 400,
): Pick<TextStyle, 'fontFamily'> {
  const numericMap: Record<string, number> = {
    normal: 400,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  };
  const raw =
    typeof weight === 'string'
      ? (numericMap[weight.toLowerCase()] ?? Number(weight))
      : weight;
  const family = fonts[kind];
  const available = Object.keys(family)
    .map(Number)
    .sort((a, b) => a - b);
  let chosen = available[0];
  let bestDiff = Math.abs(raw - chosen);
  for (const w of available) {
    const diff = Math.abs(raw - w);
    if (diff < bestDiff) {
      bestDiff = diff;
      chosen = w;
    }
  }
  return { fontFamily: family[chosen as keyof typeof family] };
}

export const typography: {
  /** @deprecated use font('heading'|'body', weight) */
  fontFamily: {
    heading: string;
    body: string;
  };
  displayLg: TextStyle;
  headlineLg: TextStyle;
  headlineMd: TextStyle;
  headlineSm: TextStyle;
  bodyLg: TextStyle;
  bodyMd: TextStyle;
  bodySm: TextStyle;
  labelLg: TextStyle;
  labelMd: TextStyle;
  labelSm: TextStyle;
  metricDisplay: TextStyle;
  displayMedium?: TextStyle;
  headlineMedium?: TextStyle;
  titleLarge?: TextStyle;
  titleMedium?: TextStyle;
  bodyMedium?: TextStyle;
  bodySmall?: TextStyle;
  labelMedium?: TextStyle;
} = {
  fontFamily: {
    heading: fonts.heading[700],
    body: fonts.body[400],
  },
  displayLg: {
    fontSize: 34,
    lineHeight: 42,
    ...font('heading', 800),
  },
  headlineLg: {
    fontSize: 26,
    lineHeight: 34,
    ...font('heading', 700),
  },
  headlineMd: {
    fontSize: 20,
    lineHeight: 28,
    ...font('heading', 700),
  },
  headlineSm: {
    fontSize: 17,
    lineHeight: 24,
    ...font('heading', 600),
  },
  bodyLg: {
    fontSize: 18,
    lineHeight: 28,
    ...font('body', 400),
  },
  bodyMd: {
    fontSize: 16,
    lineHeight: 24,
    ...font('body', 400),
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 20,
    ...font('body', 500),
  },
  labelLg: {
    fontSize: 15,
    lineHeight: 20,
    ...font('body', 700),
  },
  labelMd: {
    fontSize: 14,
    lineHeight: 20,
    ...font('body', 600),
  },
  labelSm: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    ...font('body', 700),
  },
  metricDisplay: {
    fontSize: 28,
    lineHeight: 32,
    ...font('heading', 800),
  },
};

export const rounded = {
  sm: 8,       // Tag, micro-elementos, checkboxes
  md: 14,      // Input, elementos médios
  button: 14,  // Botão legado (novos botões usam rounded.full em pílula)
  input: 14,   // Input (TextField)
  lg: 16,      // Card médio, caixa de diálogo
  xl: 20,      // Folha inferior de modal e tiles de dashboard
  sheet: 20,   // Folha de modal (igual a rounded.xl)
  card: 24,    // Card principal
  pill: 28,    // Pílula de destaque e badges grandes
  full: 9999,  // Pílula de botão, chip, avatar circular
};

export const shadows = {
  tier0: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  tier1: {
    shadowColor: '#072369',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tier2: {
    shadowColor: '#072369',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 3,
  },
  tier3: {
    shadowColor: '#072369',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
  sos: {
    shadowColor: '#FA5D4B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const sizes = {
  touchMin: 48,
  button: {
    md: 52,
    lg: 56,
    xl: 64,
  },
  iconButton: 48,
  input: 52,
};

export default {
  colors,
  fonts,
  font,
  typography,
  rounded,
  shadows,
  sizes,
};
