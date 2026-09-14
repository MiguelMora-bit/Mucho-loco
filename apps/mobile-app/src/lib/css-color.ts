import { colors } from '../theme';

// Las variables de `:root` en globals.css de customer-app, con su valor.
const CSS_VARS: Record<string, string> = {
  '--black': colors.black,
  '--black-2': colors.black2,
  '--card': colors.card,
  '--card-2': colors.card2,
  '--border': colors.border,
  '--red': colors.red,
  '--red-deep': colors.redDeep,
  '--red-bright': colors.redBright,
  '--orange': colors.orange,
  '--yellow': colors.yellow,
  '--cream': colors.cream,
  '--cream-dim': colors.creamDim,
  '--muted': colors.muted,
};

/**
 * Algunos datos del contrato traen colores escritos para la web:
 * `PerformanceStat.color` es `'var(--orange)'`. React Native no tiene
 * variables CSS, y un color que no entiende simplemente no se pinta. Aquí se
 * traducen a la paleta; un hex o rgb pasa tal cual.
 *
 * Lo correcto a futuro es que el contrato no hable CSS (un nombre de color de
 * la paleta, o un hex) — ver "Hallazgos de contrato" en el CLAUDE.md del app.
 */
export function resolveColor(value: string, fallback: string = colors.cream): string {
  const match = /^var\((--[\w-]+)\)$/.exec(value.trim());
  if (!match) return value;
  return CSS_VARS[match[1]] ?? fallback;
}
