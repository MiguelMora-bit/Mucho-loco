import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePickupOrdersStore } from '../lib/stores/pickupOrders.store';
import { pickupOrderRepository } from '../lib/repositories/pickupOrder.repository';
import type { PickupOrder } from '@mucho-loco/types';

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-MX')}`;
}

function OrderCard({ order, onDelivered }: { order: PickupOrder; onDelivered: (id: string) => void }) {
  const { t } = useTranslation();
  const [marking, setMarking] = useState(false);

  async function handleMarkDelivered() {
    setMarking(true);
    try {
      await pickupOrderRepository.markDelivered(order.id);
      onDelivered(order.id);
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="bg-ml-card border border-ml-border rounded p-4 flex items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs text-ml-cream-dim">{order.id}</span>
          <span className="text-ml-muted">·</span>
          <span className="text-xs text-ml-cream-dim">{order.placedAt}</span>
        </div>
        <div className="font-medium mb-2">{order.customerName}</div>
        <ul className="space-y-1 mb-2">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-ml-cream-dim">
              <img src={item.img} alt="" className="w-8 h-8 rounded object-cover border border-ml-border" />
              <span>
                {item.qty} × {item.name} <span className="text-ml-muted">({item.flav})</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="font-bold text-ml-red">{formatPrice(order.total)}</div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span
          className={
            'px-2 py-1 rounded text-xs font-mono uppercase ' +
            (order.status === 'ready'
              ? 'bg-ml-orange/10 text-ml-orange border border-ml-orange'
              : 'bg-ml-green/10 text-ml-green border border-ml-green')
          }
        >
          {order.status === 'ready' ? t('pickup.statusReady') : t('pickup.statusDelivered')}
        </span>
        {order.status === 'ready' && (
          <button
            onClick={handleMarkDelivered}
            disabled={marking}
            className="px-3 py-1.5 rounded bg-ml-red text-ml-cream text-sm font-medium hover:bg-ml-red-bright disabled:opacity-50 transition-colors"
          >
            {marking ? t('pickup.marking') : t('pickup.markDelivered')}
          </button>
        )}
      </div>
    </div>
  );
}

export function PickupOrdersPage() {
  const { t } = useTranslation();
  const { data, loading, error, fetch } = usePickupOrdersStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const orders = data ?? [];
  const ready = orders.filter((o) => o.status === 'ready');
  const delivered = orders.filter((o) => o.status === 'delivered');

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('pickup.title')}</h1>

      {error && (
        <div className="bg-ml-red/10 border border-ml-red text-ml-red rounded p-3 mb-4 text-sm">
          {t('pickup.loadError')}: {error}
        </div>
      )}

      {loading && !data && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded bg-ml-card border border-ml-border animate-pulse" />
          ))}
        </div>
      )}

      {!loading || data ? (
        <>
          <section className="mb-8">
            <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">
              {t('pickup.readySection')} ({ready.length})
            </h2>
            {ready.length === 0 ? (
              <p className="text-ml-muted text-sm">{t('pickup.empty')}</p>
            ) : (
              <div className="space-y-3">
                {ready.map((order) => (
                  <OrderCard key={order.id} order={order} onDelivered={() => fetch()} />
                ))}
              </div>
            )}
          </section>

          {delivered.length > 0 && (
            <section>
              <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">
                {t('pickup.deliveredSection')}
              </h2>
              <div className="space-y-3">
                {delivered.map((order) => (
                  <OrderCard key={order.id} order={order} onDelivered={() => fetch()} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
