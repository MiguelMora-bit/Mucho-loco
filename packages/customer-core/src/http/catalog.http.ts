import type { ApiClient } from '@mucho-loco/api-client';
import type { Announcement, Branch, FeedPost, MembershipTier, Product, SocialLink } from '@mucho-loco/types';
import type {
  IAnnouncementRepository,
  IBranchRepository,
  IMembershipRepository,
  IProductRepository,
  ISocialRepository,
} from '../contract';
import { CATALOG_MAX_AGE, LANDING_MAX_AGE } from './max-age';

// Dominios públicos (`@Public()` en el backend). Todos van con `auth: false`:
// en customer-app estos repositorios también corren en el navegador, donde no
// hay cookie de sesión que leer — y un endpoint público no la necesita.
//
// Campos asignados a mano y no parameter properties (`constructor(private
// readonly api)`): este paquete compila con `erasableSyntaxOnly`, igual que
// los apps de Vite.

/** `GET /branches`. */
export class BranchHttpDatasource implements IBranchRepository {
  private readonly api: ApiClient;

  constructor(api: ApiClient) {
    this.api = api;
  }

  getAll(): Promise<Branch[]> {
    return this.api.get<Branch[]>('/branches', { auth: false, maxAgeSeconds: CATALOG_MAX_AGE });
  }

  getById(id: number): Promise<Branch | null> {
    return this.api.getOrNull<Branch>(`/branches/${id}`, { auth: false, maxAgeSeconds: CATALOG_MAX_AGE });
  }

  getFeatured(): Promise<Branch[]> {
    return this.api.get<Branch[]>('/branches/featured', { auth: false, maxAgeSeconds: CATALOG_MAX_AGE });
  }
}

/** `GET /products`. */
export class ProductHttpDatasource implements IProductRepository {
  private readonly api: ApiClient;

  constructor(api: ApiClient) {
    this.api = api;
  }

  getAll(): Promise<Product[]> {
    return this.api.get<Product[]>('/products', { auth: false, maxAgeSeconds: CATALOG_MAX_AGE });
  }

  getById(id: string): Promise<Product | null> {
    return this.api.getOrNull<Product>(`/products/${id}`, { auth: false, maxAgeSeconds: CATALOG_MAX_AGE });
  }

  /**
   * `'all'` NO es un `ProductCat` — es el sentinela que usan los filtros de la
   * tienda para "sin filtro". El mock lo trataba como caso especial y el
   * backend no lo conoce (`?cat=all` consultaría una categoría inexistente y
   * devolvería vacío), así que se traduce aquí a `GET /products` pelón.
   */
  getByCategory(cat: string): Promise<Product[]> {
    if (cat === 'all') return this.getAll();
    return this.api.get<Product[]>('/products', {
      auth: false,
      query: { cat },
      maxAgeSeconds: CATALOG_MAX_AGE,
    });
  }

  /**
   * El backend deriva la categoría del propio producto, así que ignora `cat`
   * — el parámetro sigue en la firma porque es parte del contrato.
   */
  getSiblings(id: string, _cat: string): Promise<Product[]> {
    return this.api.get<Product[]>(`/products/${id}/siblings`, {
      auth: false,
      maxAgeSeconds: CATALOG_MAX_AGE,
    });
  }
}

/** Catálogo público de tiers (`single`/`all`) — no la membresía del socio, que vive en user.http.ts. */
export class MembershipHttpDatasource implements IMembershipRepository {
  private readonly api: ApiClient;

  constructor(api: ApiClient) {
    this.api = api;
  }

  getTiers(): Promise<MembershipTier[]> {
    return this.api.get<MembershipTier[]>('/membership-tiers', { auth: false, maxAgeSeconds: CATALOG_MAX_AGE });
  }
}

/** Tablón de avisos. */
export class AnnouncementHttpDatasource implements IAnnouncementRepository {
  private readonly api: ApiClient;

  constructor(api: ApiClient) {
    this.api = api;
  }

  getAll(): Promise<Announcement[]> {
    return this.api.get<Announcement[]>('/announcements', { auth: false, maxAgeSeconds: LANDING_MAX_AGE });
  }
}

/** Feed de marketing (redes del gym), no el feed interno entre socios — ese es community. */
export class SocialHttpDatasource implements ISocialRepository {
  private readonly api: ApiClient;

  constructor(api: ApiClient) {
    this.api = api;
  }

  getLinks(): Promise<SocialLink[]> {
    return this.api.get<SocialLink[]>('/social/links', { auth: false, maxAgeSeconds: LANDING_MAX_AGE });
  }

  getFeed(): Promise<FeedPost[]> {
    return this.api.get<FeedPost[]>('/social/feed', { auth: false, maxAgeSeconds: LANDING_MAX_AGE });
  }
}
