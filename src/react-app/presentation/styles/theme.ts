/**
 * Dracula-inspired color palette
 */
export const colors = {
  // Background colors
  bgPrimary: '#1e1f29',
  bgSecondary: '#282a36',
  bgTertiary: '#44475a',

  // Foreground colors
  fgPrimary: '#f8f8f2',
  fgSecondary: '#6272a4',

  // Accent colors
  accentCyan: '#8be9fd',
  accentGreen: '#50fa7b',
  accentRed: '#ff5555',
  accentOrange: '#ffb86c',
  accentYellow: '#f1fa8c',
  accentPink: '#ff79c6',
  accentPurple: '#bd93f9',

  // Diff colors
  diffAdded: '#50fa7b',
  diffRemoved: '#ff5555',
  diffModified: '#ffb86c',
  diffUnchanged: '#6272a4',
} as const;

/**
 * Spacing values
 */
export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  xxl: '3rem',
} as const;

/**
 * Font sizes
 */
export const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  md: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  xxl: '1.5rem',
} as const;

/**
 * Border radius values
 */
export const borderRadius = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
} as const;

/**
 * Z-index layers
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  modal: 1200,
  tooltip: 1300,
} as const;

/**
 * Breakpoints for responsive design
 */
export const breakpoints = {
  mobile: '640px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
} as const;

/**
 * Complete theme object
 */
export const theme = {
  colors,
  spacing,
  fontSize,
  borderRadius,
  zIndex,
  breakpoints,
} as const;

export type Theme = typeof theme;
