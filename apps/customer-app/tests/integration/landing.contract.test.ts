import { describe, it, expect, beforeAll } from 'vitest';
import { AnnouncementHttpDatasource } from '../../lib/datasources/http/announcement.http';
import { SocialHttpDatasource } from '../../lib/datasources/http/social.http';
import { MembershipHttpDatasource } from '../../lib/datasources/http/membership.http';
import { AnnouncementMockDatasource } from '../../lib/datasources/mock/announcement.mock';
import { SocialMockDatasource } from '../../lib/datasources/mock/social.mock';
import { MembershipMockDatasource } from '../../lib/datasources/mock/membership.mock';
import { requireBackend } from './api-available';

/** Contenido de landing: los 3 dominios públicos que no son catálogo. */
beforeAll(requireBackend);

describe('announcements', () => {
  it('returns the same avisos the mock seeds, field by field', async () => {
    const [http, mock] = await Promise.all([
      new AnnouncementHttpDatasource().getAll(),
      new AnnouncementMockDatasource().getAll(),
    ]);

    expect(http).toHaveLength(mock.length);
    const byId = <T extends { id: string }>(rows: T[]) =>
      [...rows].sort((a, b) => a.id.localeCompare(b.id));
    expect(byId(http)).toEqual(byId(mock));
  });

  /**
   * DIFERENCIA CONOCIDA, no un bug: el mock devuelve los avisos en el orden
   * escrito a mano en `lib/data.ts` (aniversario primero), y el backend los
   * ordena por fecha ascendente. El contenido es idéntico — solo cambia el
   * orden en que `AnnouncementsBoard` los pinta. Se deja así porque el orden
   * del mock no se deriva de ningún campo (no hay columna que lo reproduzca)
   * y el del backend sí es determinista. Si el orden del tablero importa,
   * la solución es una columna explícita de prioridad, no adivinar aquí.
   */
  it('orders by date, deterministically', async () => {
    const http = await new AnnouncementHttpDatasource().getAll();
    const dates = http.map((a) => a.date);

    expect([...dates].sort()).toEqual(dates);
  });

  it('keeps the localized fields as objects, not flattened strings', async () => {
    const [first] = await new AnnouncementHttpDatasource().getAll();

    expect(first.title).toEqual(
      expect.objectContaining({ es: expect.any(String), en: expect.any(String) }),
    );
  });
});

describe('social (marketing feed)', () => {
  it('returns the same links as the mock', async () => {
    const [http, mock] = await Promise.all([
      new SocialHttpDatasource().getLinks(),
      new SocialMockDatasource().getLinks(),
    ]);

    expect(http).toEqual(mock);
  });

  it('returns the same feed posts as the mock', async () => {
    const [http, mock] = await Promise.all([
      new SocialHttpDatasource().getFeed(),
      new SocialMockDatasource().getFeed(),
    ]);

    expect(http).toHaveLength(mock.length);
    expect(http.map((p) => p.url).sort()).toEqual(mock.map((p) => p.url).sort());
  });
});

describe('membership tiers', () => {
  it('returns both tiers with the pricing factors the landing math depends on', async () => {
    const [http, mock] = await Promise.all([
      new MembershipHttpDatasource().getTiers(),
      new MembershipMockDatasource().getTiers(),
    ]);

    expect(http).toHaveLength(mock.length);
    // El precio de membresía se calcula con estos factores (lib/pricing.ts) —
    // si el seed del backend los cambiara, la landing cobraría distinto.
    expect(http.map((t) => [t.key, t.factor])).toEqual(mock.map((t) => [t.key, t.factor]));
  });
});
