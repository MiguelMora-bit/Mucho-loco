import { statColorOf } from './performance.service';

// Spec 010: el contrato manda un nombre de la paleta, nunca CSS.
describe('statColorOf', () => {
  it('passes palette names through', () => {
    expect(statColorOf('orange')).toBe('orange');
    expect(statColorOf('green')).toBe('green');
  });

  it('normalizes what the database had before the migration', () => {
    expect(statColorOf('var(--orange)')).toBe('orange');
    expect(statColorOf(' var(--red) ')).toBe('red');
    expect(statColorOf('#6DD56D')).toBe('green');
    expect(statColorOf('#ffe066')).toBe('gold');
  });

  it('falls back to cream for anything unknown', () => {
    expect(statColorOf('var(--nope)')).toBe('cream');
    expect(statColorOf('#123456')).toBe('cream');
  });
});
