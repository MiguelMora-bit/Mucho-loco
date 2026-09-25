import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBranchInventoryStore } from '../../lib/stores/branchInventory.store';
import { counterSaleRepository, ProductNotFoundError, InsufficientStockError } from '../../lib/repositories/counterSale.repository';
import { getCurrentBranchId } from '../../lib/currentBranch';
import type { PaymentMethod } from '@mucho-loco/types';
import { CounterTicket } from '../../components/CounterTicket';

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-MX')}`;
}

export function ProductSaleTab() {
  const { t } = useTranslation();
  const { data, loading, error, fetch } = useBranchInventoryStore();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(null);
  // El ticket de la última venta, con su clave de autofactura (spec 003).
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const inventory = data ?? [];

  function addOne(productId: string, stockQty: number) {
    setCart((c) => {
      const current = c[productId] ?? 0;
      if (current >= stockQty) return c;
      return { ...c, [productId]: current + 1 };
    });
  }

  function removeOne(productId: string) {
    setCart((c) => {
      const current = c[productId] ?? 0;
      if (current <= 1) {
        const rest = { ...c };
        delete rest[productId];
        return rest;
      }
      return { ...c, [productId]: current - 1 };
    });
  }

  const cartLines = useMemo(() => {
    const inventory = data ?? [];
    return Object.entries(cart)
      .map(([productId, qty]) => {
        const product = inventory.find((i) => i.productId === productId);
        if (!product) return null;
        return { ...product, qty };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);
  }, [cart, data]);

  const total = cartLines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);

  async function handleConfirm() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const sale = await counterSaleRepository.createSale(
        getCurrentBranchId(),
        cartLines.map((l) => ({ productId: l.productId, qty: l.qty })),
        paymentMethod
      );
      setConfirmedTotal(sale.total);
      setLastSaleId(sale.id);
      setCart({});
      await fetch(); // reflects the stock already deducted
      setTimeout(() => setConfirmedTotal(null), 3000);
    } catch (e) {
      console.error(e);
      if (e instanceof InsufficientStockError) {
        setSubmitError(t('counter.products.errorInsufficientStock', { product: e.productName }));
      } else if (e instanceof ProductNotFoundError) {
        setSubmitError(t('counter.products.errorProductNotFound'));
      } else {
        setSubmitError(t('counter.products.errorGeneric'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-[1fr_320px] gap-6">
      <div>
        {lastSaleId && (
          <CounterTicket kind="sale" sourceId={lastSaleId} branchId={getCurrentBranchId()} onClose={() => setLastSaleId(null)} />
        )}
        {error && (
          <div className="bg-ml-red/10 border border-ml-red text-ml-red rounded p-3 mb-4 text-sm">
            {t('counter.products.loadError')}: {error}
          </div>
        )}

        {loading && !data && (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded bg-ml-card border border-ml-border animate-pulse" />
            ))}
          </div>
        )}

        {data && (
          <div className="grid grid-cols-2 gap-3">
            {inventory.map((item) => {
              const inCart = cart[item.productId] ?? 0;
              const outOfStock = item.qty === 0;
              return (
                <div
                  key={item.productId}
                  className={
                    'bg-ml-card border border-ml-border rounded p-3 flex flex-col gap-2 ' +
                    (outOfStock ? 'opacity-50' : '')
                  }
                >
                  <div className="flex items-center gap-3">
                    <img src={item.img} alt="" className="w-12 h-12 rounded object-cover border border-ml-border shrink-0" />
                    <div className="font-medium text-sm">{item.productName}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ml-red font-bold">{formatPrice(item.unitPrice)}</span>
                    <span className="text-xs text-ml-cream-dim font-mono">
                      {outOfStock ? t('counter.products.outOfStock') : `${t('counter.products.stockLabel')}: ${item.qty}`}
                    </span>
                  </div>
                  {!outOfStock && (
                    <div className="flex items-center justify-between mt-1">
                      <button
                        onClick={() => removeOne(item.productId)}
                        disabled={inCart === 0}
                        className="w-7 h-7 rounded bg-ml-card-2 border border-ml-border disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="font-mono">{inCart}</span>
                      <button
                        onClick={() => addOne(item.productId, item.qty)}
                        disabled={inCart >= item.qty}
                        className="w-7 h-7 rounded bg-ml-card-2 border border-ml-border disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-ml-card border border-ml-border rounded p-4 h-fit sticky top-6">
        <h2 className="text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3">{t('counter.products.currentSale')}</h2>

        {confirmedTotal !== null && (
          <div className="bg-ml-green/10 border border-ml-green text-ml-green rounded p-3 mb-3 text-sm">
            ✓ {t('counter.products.saleConfirmed')} {formatPrice(confirmedTotal)}
          </div>
        )}

        {cartLines.length === 0 ? (
          <p className="text-ml-muted text-sm mb-4">{t('counter.products.empty')}</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {cartLines.map((line) => (
              <li key={line.productId} className="flex items-center justify-between text-sm gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <img src={line.img} alt="" className="w-6 h-6 rounded object-cover border border-ml-border shrink-0" />
                  <span className="truncate">{line.qty} × {line.productName}</span>
                </span>
                <span className="font-medium shrink-0">{formatPrice(line.qty * line.unitPrice)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-between font-bold text-lg mb-4 pt-2 border-t border-ml-border">
          <span>{t('counter.products.total')}</span>
          <span className="text-ml-red">{formatPrice(total)}</span>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setPaymentMethod('cash')}
            className={
              'flex-1 py-2 rounded text-sm font-medium border ' +
              (paymentMethod === 'cash'
                ? 'bg-ml-red border-ml-red text-ml-cream'
                : 'border-ml-border text-ml-cream-dim')
            }
          >
            {t('counter.products.cashLabel')}
          </button>
          <button
            onClick={() => setPaymentMethod('card')}
            className={
              'flex-1 py-2 rounded text-sm font-medium border ' +
              (paymentMethod === 'card'
                ? 'bg-ml-red border-ml-red text-ml-cream'
                : 'border-ml-border text-ml-cream-dim')
            }
          >
            {t('counter.products.cardLabel')}
          </button>
        </div>

        {submitError && <p className="text-ml-red text-xs mb-3">{submitError}</p>}

        <button
          onClick={handleConfirm}
          disabled={cartLines.length === 0 || submitting}
          className="w-full py-2.5 rounded bg-ml-red text-ml-cream font-medium hover:bg-ml-red-bright disabled:opacity-40 transition-colors"
        >
          {submitting ? t('counter.products.processing') : t('counter.products.confirm')}
        </button>
      </div>
    </div>
  );
}
