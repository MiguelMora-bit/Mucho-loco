import type { Prisma } from '@prisma/client';
import type { ShippingAddress } from '@mucho-loco/types';

/** Lo que se guarda en `orders.shippingAddress`: solo los campos conocidos. */
export function shippingAddressJson(address: ShippingAddress): Prisma.InputJsonObject {
  return {
    street: address.street,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    phone: address.phone,
    ...(address.references ? { references: address.references } : {}),
  };
}

export function shippingAddressFromJson(value: Prisma.JsonValue | null): ShippingAddress | undefined {
  return value ? (value as unknown as ShippingAddress) : undefined;
}
