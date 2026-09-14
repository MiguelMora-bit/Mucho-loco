import type { ImageSource } from 'expo-image';

/**
 * El catálogo guarda algunas imágenes como rutas relativas del sitio web
 * (`/assets/prod-bcaa.jpg`, servidas desde `public/` de customer-app). Una
 * app nativa no tiene "sitio" contra el cual resolverlas, así que esas pocas
 * van empaquetadas en la app. Las URLs absolutas (Unsplash) se cargan tal cual.
 *
 * Cuando las imágenes del catálogo vivan en un CDN con URL absoluta, este
 * mapa sobra y se borra.
 */
const BUNDLED: Record<string, number> = {
  '/assets/mucho-loco-logo.jpg': require('../../assets/images/products/mucho-loco-logo.jpg'),
  '/assets/prod-bcaa.jpg': require('../../assets/images/products/prod-bcaa.jpg'),
  '/assets/prod-creatine.jpg': require('../../assets/images/products/prod-creatine.jpg'),
  '/assets/prod-energy.jpg': require('../../assets/images/products/prod-energy.jpg'),
  '/assets/prod-goma.jpg': require('../../assets/images/products/prod-goma.jpg'),
  '/assets/prod-pre-mango.jpg': require('../../assets/images/products/prod-pre-mango.jpg'),
  '/assets/prod-whey-cappuccino.jpg': require('../../assets/images/products/prod-whey-cappuccino.jpg'),
  '/assets/prod-whey-flavors.jpg': require('../../assets/images/products/prod-whey-flavors.jpg'),
  '/assets/prod-whey-strawberry.jpg': require('../../assets/images/products/prod-whey-strawberry.jpg'),
};

export function imageSource(src: string): ImageSource | number {
  return BUNDLED[src] ?? { uri: src };
}
