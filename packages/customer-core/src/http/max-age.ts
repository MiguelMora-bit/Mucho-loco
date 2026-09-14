// Cuánto puede tener de viejo cada tipo de dato público. Los datasources lo
// declaran con `maxAgeSeconds`; qué hacer con eso lo decide cada app en la
// `cachePolicy` de su cliente (Next revalida, el móvil lo ignora).

/** Catálogo (sucursales, productos, tiers): cambia poco. */
export const CATALOG_MAX_AGE = 300;

/** Contenido de landing (avisos, redes): un aviso nuevo debe salir pronto. */
export const LANDING_MAX_AGE = 60;
