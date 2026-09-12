import type { AccessMethod } from '../AccessMethod';
import { qrAccessMethod } from './qrAccessMethod';
import { fingerprintAccessMethod } from './fingerprintAccessMethod';
import { nameAccessMethod } from './nameAccessMethod';

export { qrAccessMethod } from './qrAccessMethod';
export { fingerprintAccessMethod } from './fingerprintAccessMethod';
export { nameAccessMethod } from './nameAccessMethod';

/** Los 3 métodos de entrada de mostrador, en el orden en que se intentan: QR
 *  primero (lo más común, socio con la app), huella después (sin app),
 *  nombre al final (último recurso si el lector falla). Agregar un 4to
 *  método de entrada es agregarlo aquí — nada más en este archivo cambia. */
export const ACCESS_METHODS: readonly AccessMethod[] = [qrAccessMethod, fingerprintAccessMethod, nameAccessMethod];
