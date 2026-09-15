import type { ShippingAddress } from '@mucho-loco/types';
import { toE164 } from './phone';

export type ShippingAddressField = keyof ShippingAddress;

/** Formulario vacío — los dos checkouts arrancan de aquí. */
export const EMPTY_SHIPPING_ADDRESS: ShippingAddress = {
  street: '',
  neighborhood: '',
  city: '',
  state: '',
  postalCode: '',
  phone: '',
  references: '',
};

/**
 * Limpia lo que escribió el socio y dice qué campos no sirven. Mismas reglas
 * que `ShippingAddressDto` del backend, que es la autoridad: esto sirve para
 * marcar el campo antes de mandar, y para que el mock rechace lo mismo que el
 * backend. El teléfono sale en E.164, que es lo que el backend exige.
 */
export function parseShippingAddress(input: ShippingAddress): {
  address: ShippingAddress;
  invalid: ShippingAddressField[];
} {
  const trim = (value: string | undefined) => (value ?? '').trim();
  const phone = toE164(input.phone ?? '');
  const references = trim(input.references);
  const address: ShippingAddress = {
    street: trim(input.street),
    neighborhood: trim(input.neighborhood),
    city: trim(input.city),
    state: trim(input.state),
    postalCode: trim(input.postalCode),
    phone: phone ?? trim(input.phone),
    ...(references ? { references } : {}),
  };

  const between = (value: string, min: number, max: number) => value.length >= min && value.length <= max;
  const invalid: ShippingAddressField[] = [];
  if (!between(address.street, 3, 120)) invalid.push('street');
  if (!between(address.neighborhood, 2, 80)) invalid.push('neighborhood');
  if (!between(address.city, 2, 80)) invalid.push('city');
  if (!between(address.state, 2, 40)) invalid.push('state');
  if (!/^\d{5}$/.test(address.postalCode)) invalid.push('postalCode');
  if (!phone) invalid.push('phone');
  if (references.length > 200) invalid.push('references');
  return { address, invalid };
}

/** Las líneas de la dirección como se leen en una etiqueta de envío. */
export function shippingAddressLines(address: ShippingAddress): string[] {
  return [
    address.street,
    `${address.neighborhood}, ${address.city}`,
    `${address.state} ${address.postalCode}`,
    ...(address.references ? [address.references] : []),
  ];
}
