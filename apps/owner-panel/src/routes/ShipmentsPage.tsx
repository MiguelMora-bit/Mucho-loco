import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Lang, ShipmentOrder } from '@mucho-loco/types';
import { useShipmentsStore } from '../lib/stores/shipments.store';
import { shipmentsRepository, ShipmentStateError } from '../lib/repositories/shipments.repository';
import { formatDate } from '../lib/dates';

// Referencia estable: `?? []` daría un arreglo nuevo en cada render.
const NO_SHIPMENTS: ShipmentOrder[] = [];

const money = (amount: number) => `$${amount.toLocaleString('es-MX')}`;

function ShipmentCard({ shipment, lang, children }: { shipment: ShipmentOrder; lang: Lang; children?: ReactNode }) {
  const { t } = useTranslation();
  const { address } = shipment;
  return (
    <article className="bg-ml-card border border-ml-border rounded p-4 grid grid-cols-2 gap-4">
      <div>
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <b className="font-mono text-sm">#{shipment.id.slice(0, 8).toUpperCase()}</b>
          <span className="text-ml-cream-dim text-xs">{t('shipments.placedAt', { date: formatDate(shipment.placedAt, lang) })}</span>
        </div>
        <p className="font-medium mb-1">{shipment.customerName}</p>
        <ul className="text-sm text-ml-cream-dim space-y-0.5 mb-2">
          {shipment.items.map((item, i) => (
            <li key={i}>
              {item.name} · {item.flav} × {item.qty}
            </li>
          ))}
        </ul>
        <p className="text-sm">
          {t('shipments.total')}: <b>{money(shipment.total)}</b>
        </p>
      </div>
      <div className="text-sm">
        {address ? (
          <address className="not-italic space-y-0.5">
            <p className="font-medium">{address.street}</p>
            <p className="text-ml-cream-dim">{address.neighborhood}, {address.city}</p>
            <p className="text-ml-cream-dim">{address.state} {address.postalCode}</p>
            <p className="text-ml-cream-dim">{t('shipments.phone')} {address.phone}</p>
            {address.references && <p className="text-ml-cream-dim italic">{address.references}</p>}
          </address>
        ) : (
          <p className="text-ml-red text-xs">{t('shipments.noAddress')}</p>
        )}
        {shipment.trackingNumber && (
          <p className="mt-2 font-mono text-xs">{t('shipments.tracking', { number: shipment.trackingNumber })}</p>
        )}
        {shipment.shippedAt && (
          <p className="text-ml-cream-dim text-xs">{t('shipments.shippedAt', { date: formatDate(shipment.shippedAt, lang) })}</p>
        )}
        {shipment.deliveredAt && (
          <p className="text-ml-cream-dim text-xs">{t('shipments.deliveredAt', { date: formatDate(shipment.deliveredAt, lang) })}</p>
        )}
      </div>
      {children && <div className="col-span-2 flex items-end gap-3 border-t border-ml-border pt-3">{children}</div>}
    </article>
  );
}

/**
 * Envíos a domicilio desde la bodega central. Solo aparecen pedidos ya
 * cobrados (el backend no manda los que tienen una sesión de Stripe sin
 * pagar): por enviar → en camino → entregado.
 */
export function ShipmentsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const shipments = useShipmentsStore();
  const { fetch } = shipments;

  useEffect(() => {
    fetch();
  }, [fetch]);

  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const all = shipments.data ?? NO_SHIPMENTS;
  const toShip = all.filter((s) => s.status === 'to_ship');
  const inTransit = all.filter((s) => s.status === 'shipped');
  // La lista viene del más viejo al más nuevo; en entregados importa lo reciente.
  const delivered = all.filter((s) => s.status === 'delivered').reverse();

  // Tras cada acción se vuelve a pedir la lista en vez de parchar la copia
  // local — mismo criterio que el resto del panel.
  async function run(orderId: string, action: () => Promise<unknown>) {
    setBusyId(orderId);
    setActionError(null);
    try {
      await action();
      await fetch();
    } catch (err) {
      if (err instanceof ShipmentStateError) {
        setActionError(t('shipments.errorStale'));
        await fetch();
      } else {
        console.error(err);
        setActionError(t('shipments.errorGeneric'));
      }
    } finally {
      setBusyId(null);
    }
  }

  const buttonClass =
    'px-4 py-2 rounded bg-ml-red text-ml-cream text-sm font-medium hover:bg-ml-red-bright disabled:opacity-40 transition-colors';

  function section(title: string, items: ShipmentOrder[], action?: (s: ShipmentOrder) => ReactNode) {
    return (
      <section>
        <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">
          {title} · {items.length}
        </h2>
        {items.length === 0 ? (
          <p className="text-ml-cream-dim text-sm">{t('shipments.empty')}</p>
        ) : (
          <div className="space-y-3">
            {items.map((s) => (
              <ShipmentCard key={s.id} shipment={s} lang={lang}>
                {action?.(s)}
              </ShipmentCard>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">{t('shipments.title')}</h1>
        <p className="text-ml-cream-dim text-sm">{t('shipments.subtitle')}</p>
      </div>

      {shipments.error && (
        <div className="bg-ml-red/10 border border-ml-red text-ml-red rounded p-3 text-sm">
          {t('shipments.loadError')}: {shipments.error}
        </div>
      )}
      {actionError && (
        <div role="alert" className="bg-ml-red/10 border border-ml-red text-ml-red rounded p-3 text-sm">
          {actionError}
        </div>
      )}

      {shipments.loading && !shipments.data ? (
        <div className="h-24 rounded bg-ml-card border border-ml-border animate-pulse" />
      ) : (
        <>
          {section(t('shipments.toShipTitle'), toShip, (s) => (
            <>
              <div className="flex-1">
                <label htmlFor={`tracking-${s.id}`} className="text-xs font-mono uppercase text-ml-cream-dim block mb-1.5">
                  {t('shipments.trackingLabel')}
                </label>
                <input
                  id={`tracking-${s.id}`}
                  value={tracking[s.id] ?? ''}
                  onChange={(e) => setTracking((current) => ({ ...current, [s.id]: e.target.value }))}
                  placeholder={t('shipments.trackingPlaceholder')}
                  maxLength={60}
                  className="w-full bg-ml-black-2 border border-ml-border rounded px-3 py-2 text-sm focus:outline-none focus:border-ml-red"
                />
              </div>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => run(s.id, () => shipmentsRepository.markShipped(s.id, tracking[s.id]))}
                className={buttonClass}
              >
                {busyId === s.id ? t('shipments.working') : t('shipments.markShipped')}
              </button>
            </>
          ))}
          {section(t('shipments.inTransitTitle'), inTransit, (s) => (
            <button
              type="button"
              disabled={busyId !== null}
              onClick={() => run(s.id, () => shipmentsRepository.markDelivered(s.id))}
              className={buttonClass}
            >
              {busyId === s.id ? t('shipments.working') : t('shipments.markDelivered')}
            </button>
          ))}
          {section(t('shipments.deliveredTitle'), delivered)}
        </>
      )}
    </div>
  );
}
