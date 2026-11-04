import { TextStyle } from 'react-native';

/**
 * SeniorInsight Design System Tokens
 * Conforme especificação em DESIGN.md
 */

export const colors = {
  // Básicos & Aliases Diretos
  white: '#FFFFFF',
  black: '#000000',
  navy: '#072369',
  navyDark: '#0F1E36',
  navyLight: '#253B80',
  coral: '#FA5D4B',
  coralDark: '#B32A1E',
  coralBright: '#FF6B5B',

  // Brand & Core
  primary: '#072369',
  primaryNavy: '#253B80',
  primaryNavyDeep: '#1E306E',
  primaryContainer: '#253B80',
  onPrimary: '#FFFFFF',

  // Secondary & Urgent
  secondary: '#B32A1E',
  secondaryCoral: '#FA5D4B',
  secondaryCoralBright: '#FF6B5B',
  secondaryContainer: '#FF614F',
  onSecondary: '#FFFFFF',

  // Neutrals & Surfaces
  canvasBase: '#F8FAFC',
  canvasCard: '#FFFFFF',
  background: '#FAF8FF',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F4F9',
  surfaceContainer: '#E9EDFF',
  surfaceContainerLow: '#F2F3FF',
  surfaceContainerHigh: '#E2E8FC',

  // Text & Content
  onSurface: '#151B2A',
  onSurfaceVariant: '#444651',
  textPrimary: '#151B2A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  slate400: '#94A3B8',
  slate100: '#F1F5F9',

  // Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#E2E8F0',
  outline: '#757682',
  outlineVariant: '#C5C5D2',

  // Functional Pastels (Objetos + Aliases Planos para compatibilidade total)
  mint: {
    background: '#E8F8F0',
    border: '#B8ECD3',
    text: '#059669',
    textDark: '#003119',
  },
  mintBg: '#E8F8F0',
  mintBorder: '#B8ECD3',
  mintText: '#059669',

  peach: {
    background: '#FFEBE5',
    border: '#FFCDC2',
    text: '#E11D48',
    textDark: '#650001',
  },
  peachBg: '#FFEBE5',
  peachBorder: '#FFCDC2',
  peachText: '#991B1B',

  sky: {
    background: '#E6F3FA',
    border: '#C4E4F5',
    text: '#0284C7',
    textDark: '#0369A1',
  },
  skyBg: '#E6F3FA',
  skyBorder: '#C4E4F5',
  skyText: '#0284C7',

  amber: {
    background: '#FFF8E7',
    border: '#FFE8B3',
    text: '#D97706',
    textDark: '#78350F',
  },
  amberBg: '#FFF8E7',
  amberBorder: '#FFE8B3',
  amberText: '#D97706',

  lavender: {
    background: '#F0EEFC',
    border: '#D9D4F8',
    text: '#7C3AED',
    textDark: '#4C1D95',
  },
  lavenderBg: '#F0EEFC',
  lavenderBorder: '#D9D4F8',
  lavenderText: '#7C3AED',

  // Status & Feedback
  success: '#10B981',
  successDark: '#059669',
  warning: '#F59E0B',
  error: '#BA1A1A',
  errorBright: '#DC2626',
};

export const typography: {
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
    heading: 'Plus Jakarta Sans',
    body: 'Inter',
  },
  displayLg: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 42,
  },
  headlineLg: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
  },
  headlineMd: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  headlineSm: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },
  bodyLg: {
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 28,
  },
  bodyMd: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodySm: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  labelLg: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  labelMd: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  labelSm: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  metricDisplay: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
};

export const rounded = {
  sm: 10,      // Micro-elementos, checkboxes, tags inline
  md: 14,      // Inputs, pequenos botões
  button: 14,  // Botões padrão
  input: 14,   // Campos de texto
  lg: 16,      // Cards médios, caixas de diálogo
  xl: 20,      // Dashboard tiles, modal sheet
  card: 24,    // Cards principais
  pill: 28,    // Botões pill
  full: 9999,  // Botões circulares, chips, avatares
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tier2: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  tier3: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
};

export default {
  colors,
  typography,
  rounded,
  shadows,
};
