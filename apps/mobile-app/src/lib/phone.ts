// Se mudó a @mucho-loco/customer-core: también lo usa la web, para el
// teléfono del repartidor en la dirección de envío. Re-export para no tocar
// a sus importadores (el registro) ni a phone.test.ts.
export { toE164 } from '@mucho-loco/customer-core/phone';
