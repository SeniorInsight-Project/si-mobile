/**
 * Mapa de referência para migração de cores hexadecimais legadas (Etapas 4–6)
 * para tokens semânticos de `src/theme/index.ts`.
 *
 * IMPORTANTE: Este arquivo é apenas referência para as etapas de migração
 * e para validação estática; nenhuma tela deve importá-lo em runtime.
 */
export const legacyColorMap: Record<string, string> = {
  // Brancos e pretos
  '#FFFFFF': 'white',
  '#000': 'black',
  '#000000': 'black',

  // Navy / Primário
  '#031753': 'primary',
  '#072369': 'primary',
  '#1A285A': 'primary',
  '#1E2E69': 'primaryNavy',
  '#1E3A8A': 'primaryNavy',
  '#1E40AF': 'primaryNavy',
  '#253B80': 'primaryNavy',
  '#2563EB': 'primaryNavy',
  '#2D418A': 'primaryNavy',
  '#1D4ED8': 'primaryNavy',
  '#3B82F6': 'primaryNavy',

  // Coral / Erro / Urgência
  '#B32A1E': 'coralDark',
  '#B51C13': 'coralDark',
  '#D83729': 'coralDark',
  '#8C120A': 'coralDark',
  '#BA1A1A': 'error',
  '#B91C1C': 'error',
  '#DC2626': 'error',
  '#EF4444': 'error',
  '#FA5D4B': 'coral',

  // Textos & Neutros escuros
  '#0F172A': 'textPrimary',
  '#131E3D': 'textPrimary',
  '#151B2A': 'textPrimary',
  '#1E293B': 'textPrimary',
  '#334155': 'onSurfaceVariant',
  '#475467': 'onSurfaceVariant',
  '#475569': 'onSurfaceVariant',
  '#525B70': 'onSurfaceVariant',
  '#64748B': 'textSecondary',
  '#94A3B8': 'textMuted',

  // Superfícies & Fundos neutros
  '#F7F9FC': 'canvasBase',
  '#F8FAFC': 'canvasBase',
  '#EEF2F6': 'surfaceSubtle',
  '#F1F5F9': 'surfaceSubtle',
  '#F2F4F7': 'surfaceSubtle',
  '#F5F7FA': 'surfaceSubtle',
  '#E9EDFF': 'surfaceContainer',
  '#B7C4FF': 'surfaceContainerHigh',

  // Info surfaces
  '#D0E8FF': 'infoSurface',
  '#DBEAFE': 'infoSurface',
  '#EBF2FF': 'infoSurface',
  '#EBF5FF': 'infoSurface',
  '#EFF6FF': 'infoSurface',
  '#F0F9FF': 'infoSurface',

  // Bordas
  '#CBD5E1': 'outlineVariant',
  '#E2E8F0': 'border',

  // Sucesso & Mint
  '#10B981': 'success',
  '#059669': 'successDark',
  '#047857': 'successDark',
  '#ECFDF5': 'mint.background',
  '#E8F8F0': 'mint.background',
  '#A7F3D0': 'mint.border',
  '#B8ECD3': 'mint.border',
  '#003B26': 'mint.textDark',
  '#065F46': 'mint.textDark',

  // Peach / Alerta crítico pastel
  '#FEE2E2': 'peach.background',
  '#FEF2F2': 'peach.background',
  '#FFEBE5': 'peach.background',
  '#FFEBE7': 'peach.background',
  '#FFF1EC': 'peach.background',
  '#FFF1F2': 'peach.background',
  '#FECACA': 'peach.border',
  '#FECDD3': 'peach.border',
  '#FFCDC2': 'peach.border',
  '#FFCECB': 'peach.border',
  '#991B1B': 'peach.text',
  '#650001': 'peach.textDark',

  // Sky / Hidratação, sono, info
  '#E0F2FE': 'sky.background',
  '#E6F3FA': 'sky.background',
  '#E8F1F5': 'sky.background',
  '#BAE6FD': 'sky.border',
  '#BFDBFE': 'sky.border',
  '#C4E4F5': 'sky.border',
  '#0284C7': 'sky.text',
  '#0369A1': 'sky.textDark',
  '#0C4A6E': 'sky.textDark',

  // Amber / Atenção, tolerância
  '#F59E0B': 'warning',
  '#D97706': 'amber.text',
  '#FEF3C7': 'amber.background',
  '#FFF8E7': 'amber.background',
  '#FFFBEB': 'amber.background',
  '#FCD34D': 'amber.border',
  '#FDE68A': 'amber.border',
  '#FED7AA': 'amber.border',
  '#FFE8B3': 'amber.border',
  '#78350F': 'amber.textDark',
  '#92400E': 'amber.textDark',
  '#9A3412': 'amber.textDark',
  '#B45309': 'amber.textDark',

  // Lavender / Terapia, repouso, resumos
  '#EDE9FE': 'lavender.background',
  '#F0EEFC': 'lavender.background',
  '#F3E8FF': 'lavender.background',
  '#F3EEFF': 'lavender.background',
  '#F5F3FF': 'lavender.background',
  '#D9D4F8': 'lavender.border',
  '#DDD6FE': 'lavender.border',
  '#E9D5FF': 'lavender.border',
  '#6D28D9': 'lavender.text',
  '#7C3AED': 'lavender.text',
  '#4C1D95': 'lavender.textDark',
  '#5B21B6': 'lavender.textDark',
};

export default legacyColorMap;
