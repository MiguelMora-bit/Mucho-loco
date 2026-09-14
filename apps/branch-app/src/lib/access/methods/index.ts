import type { AccessMethod } from '../AccessMethod';
import { isHttpDatasourceEnabled } from '../../datasources/http/config';
import { QrAccessMethod } from './qrAccessMethod';
import { FingerprintAccessMethod } from './fingerprintAccessMethod';
import { NameAccessMethod } from './nameAccessMethod';
import {
  qrHttpAccessMethod,
  fingerprintHttpAccessMethod,
  nameHttpAccessMethod,
} from './httpAccessMethod';

// Mock o backend NestJS real, según VITE_DATA_SOURCE — misma decisión y mismo
// lugar único que los repositorios (ver datasources/http/config.ts).
export const qrAccessMethod: AccessMethod = isHttpDatasourceEnabled()
  ? qrHttpAccessMethod
  : new QrAccessMethod();
export const fingerprintAccessMethod: AccessMethod = isHttpDatasourceEnabled()
  ? fingerprintHttpAccessMethod
  : new FingerprintAccessMethod();
export const nameAccessMethod: AccessMethod = isHttpDatasourceEnabled()
  ? nameHttpAccessMethod
  : new NameAccessMethod();

/** Los 3 métodos de entrada de mostrador, en el orden en que se intentan: QR
 *  primero (lo más común, socio con la app), huella después (sin app),
 *  nombre al final (último recurso si el lector falla). Agregar un 4to
 *  método de entrada es agregarlo aquí — nada más en este archivo cambia. */
export const ACCESS_METHODS: readonly AccessMethod[] = [qrAccessMethod, fingerprintAccessMethod, nameAccessMethod];
