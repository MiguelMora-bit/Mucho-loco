import { describe, expect, it } from 'vitest';
import type { ShippingAddress } from '@mucho-loco/types';
import { EMPTY_SHIPPING_ADDRESS, parseShippingAddress, shippingAddressLines } from './shipping';

const typed: ShippingAddress = {
  street: '  Av. Insurgentes Sur 1234, int. 5 ',
  neighborhood: 'Roma Sur',
  city: 'Cuauhtémoc',
  state: 'CDMX',
  postalCode: '06760',
  phone: '55 1234 5678',
  references: '',
};

describe('parseShippingAddress', () => {
  it('trims what the member typed and sends the phone as E.164, which is what the backend accepts', () => {
    const { address, invalid } = parseShippingAddress(typed);

    expect(invalid).toEqual([]);
    expect(address.street).toBe('Av. Insurgentes Sur 1234, int. 5');
    expect(address.phone).toBe('+525512345678');
    expect(address).not.toHaveProperty('references');
  });

  it('flags every required field of an empty form', () => {
    expect(parseShippingAddress(EMPTY_SHIPPING_ADDRESS).invalid).toEqual([
      'street',
      'neighborhood',
      'city',
      'state',
      'postalCode',
      'phone',
    ]);
  });

  // Los dos errores que más se cuelan: el CP sin el cero inicial y un
  // teléfono incompleto, al que el repartidor no podría llamar.
  it('rejects a 4-digit postal code and a phone it cannot read', () => {
    expect(parseShippingAddress({ ...typed, postalCode: '6760', phone: '1234' }).invalid).toEqual([
      'postalCode',
      'phone',
    ]);
  });
});

describe('shippingAddressLines', () => {
  it('reads like a shipping label, with the references last', () => {
    const { address } = parseShippingAddress({ ...typed, references: 'Portón negro' });

    expect(shippingAddressLines(address)).toEqual([
      'Av. Insurgentes Sur 1234, int. 5',
      'Roma Sur, Cuauhtémoc',
      'CDMX 06760',
      'Portón negro',
    ]);
  });
});
