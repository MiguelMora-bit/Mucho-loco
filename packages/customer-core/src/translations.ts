import type { Lang, Translations } from '@mucho-loco/types';
import en from '../messages/en.json';
import es from '../messages/es.json';

/**
 * Los mensajes, ya tipados. customer-app los carga como JSON crudo vía
 * next-intl (`i18n/request.ts`) y los castea en `useT()`; mobile-app no tiene
 * next-intl y los lee de aquí.
 *
 * Asignarlos a `Translations` es lo que verifica en compilación que los dos
 * JSON sigan teniendo la forma que la UI espera: una clave que falte en
 * `en.json` truena aquí, no en pantalla.
 */
export const translations: Record<Lang, Translations> = { es, en };
