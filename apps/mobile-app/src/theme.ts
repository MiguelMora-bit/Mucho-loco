/**
 * Paleta y tipografía de Mucho Loco — los mismos valores que `ml.*` en
 * `tailwind.config.js` de customer-app.
 *
 * En React Native no hay CSS, clases ni variables `--red`: los estilos son
 * objetos JS (`StyleSheet.create`). Por eso la paleta vive aquí como
 * constantes y cada componente las importa.
 */
export const colors = {
  black: '#0a0606',
  black2: '#140909',
  card: '#1a0a0a',
  card2: '#221010',
  border: '#2a1414',
  red: '#e1141c',
  redDeep: '#a30b11',
  redBright: '#ff1a24',
  orange: '#ff6b1a',
  yellow: '#ffb627',
  cream: '#f4ebe0',
  creamDim: '#b8a99c',
  muted: '#6b5a52',
  green: '#6dd56d',
  gold: '#ffe066',
} as const;

/**
 * Nombres con los que `useFonts` registra cada fuente en `app/_layout.tsx`.
 * En RN `fontFamily` apunta a un archivo cargado, no a una familia con pesos:
 * negrita es otro nombre (`Inter_700Bold`), no `fontWeight: 'bold'`.
 */
export const fonts = {
  display: 'Anton_400Regular',
  bebas: 'BebasNeue_400Regular',
  body: 'Inter_400Regular',
  bodyBold: 'Inter_700Bold',
  mono: 'JetBrainsMono_400Regular',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
