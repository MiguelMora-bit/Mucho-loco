import { describe, it, expect } from 'vitest';
import { WHATSAPP, whatsappUrl } from './contact';

describe('whatsappUrl', () => {
  it('opens a chat with the business number and the message already written', () => {
    const url = new URL(whatsappUrl('Folio: ABC-123 & más'));
    expect(url.origin + url.pathname).toBe(`https://wa.me/${WHATSAPP.number}`);
    expect(url.searchParams.get('text')).toBe('Folio: ABC-123 & más');
  });
});
