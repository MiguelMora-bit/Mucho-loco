import { describe, expect, it } from 'vitest';
import { colors } from '../theme';
import { resolveColor } from './css-color';

describe('resolveColor', () => {
  it('translates a web CSS variable to the palette', () => {
    expect(resolveColor('var(--orange)')).toBe(colors.orange);
    expect(resolveColor(' var(--red) ')).toBe(colors.red);
  });

  it('passes real colors through untouched', () => {
    expect(resolveColor('#6dd56d')).toBe('#6dd56d');
    expect(resolveColor('rgba(225,20,28,0.5)')).toBe('rgba(225,20,28,0.5)');
  });

  it('falls back for an unknown variable instead of painting nothing', () => {
    expect(resolveColor('var(--nope)')).toBe(colors.cream);
  });
});
