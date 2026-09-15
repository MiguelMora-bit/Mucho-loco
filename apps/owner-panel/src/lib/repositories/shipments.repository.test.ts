import { describe, it, expect } from 'vitest';
import { shipmentsRepository, ShipmentStateError } from './shipments.repository';

describe('shipmentsRepository (mock)', () => {
  it('lists every shipment with the address the warehouse ships to', async () => {
    const shipments = await shipmentsRepository.getAll();

    expect(shipments.length).toBeGreaterThan(0);
    const toShip = shipments.find((s) => s.status === 'to_ship');
    expect(toShip?.address?.postalCode).toMatch(/^\d{5}$/);
  });

  it('moves a shipment from to ship → on its way → delivered, keeping the tracking number', async () => {
    const toShip = (await shipmentsRepository.getAll()).find((s) => s.status === 'to_ship')!;

    const shipped = await shipmentsRepository.markShipped(toShip.id, ' 1Z-TEST ');
    expect(shipped.status).toBe('shipped');
    expect(shipped.trackingNumber).toBe('1Z-TEST');
    expect(shipped.shippedAt).toBeTruthy();

    const delivered = await shipmentsRepository.markDelivered(toShip.id);
    expect(delivered.status).toBe('delivered');
    expect(delivered.deliveredAt).toBeTruthy();

    const after = (await shipmentsRepository.getAll()).find((s) => s.id === toShip.id);
    expect(after?.status).toBe('delivered');
  });

  // Mismo contrato que el backend: la pantalla solo ofrece la acción válida,
  // pero con dos pestañas abiertas la lista puede estar vieja.
  it('refuses a move that no longer applies with a typed error', async () => {
    const shipments = await shipmentsRepository.getAll();
    const delivered = shipments.find((s) => s.status === 'delivered')!;

    const again = await shipmentsRepository.markShipped(delivered.id).catch((e: unknown) => e);
    expect(again).toBeInstanceOf(ShipmentStateError);
    expect((again as ShipmentStateError).reason).toBe('already_delivered');
  });
});
