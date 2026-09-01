import { useState } from 'react';
import { formatPrice } from '@/lib/pricing';
import type { Product, Translations } from '@mucho-loco/types';

interface InfoProps {
  product: Product;
  catLabel: string;
  t: Translations;
}

export function Info({ product, catLabel, t }: InfoProps) {
  const [qty, setQty] = useState(1);
  const [wishlist, setWishlist] = useState(false);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="pd-info">
      <span className="cat-eyebrow">{catLabel}</span>
      <h1>{product.name}</h1>
      <div className="flav-label">{product.flav}</div>
      <div className="price-row">
        <div className="price">{formatPrice(product.price)}<small className="text-ml-cream-dim text-lg ml-1.5">MXN</small></div>
      </div>
      <div className="qty-row">
        <div className="qty-ctrl">
          <button onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
          <span>{qty}</span>
          <button onClick={() => setQty(q => q + 1)}>+</button>
        </div>
        <span className="text-ml-cream-dim text-xs font-mono">× {formatPrice(product.price * qty)} total</span>
      </div>
      <div className="pd-actions">
        <button className={'add-btn-main' + (added ? ' done' : '')} onClick={handleAdd}>
          {added
            ? `✓ ${t.product.addedToBag}`
            : `🔥 ${t.product.addToBag}`}
        </button>
        <button className={'wishlist-btn' + (wishlist ? ' active' : '')} onClick={() => setWishlist(w => !w)}>
          {wishlist ? '♥' : '♡'}
        </button>
      </div>
      <div className="mt-6 p-[18px] bg-ml-card border border-ml-border grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="font-display text-[22px] text-ml-orange">🏪</div>
          <div className="text-[11px] font-mono text-ml-cream-dim mt-1">{t.product.branchPickup}</div>
        </div>
        <div className="text-center">
          <div className="font-display text-[22px] text-ml-orange">📦</div>
          <div className="text-[11px] font-mono text-ml-cream-dim mt-1">{t.product.homeDelivery}</div>
        </div>
        <div className="text-center">
          <div className="font-display text-[22px] text-ml-orange">🔒</div>
          <div className="text-[11px] font-mono text-ml-cream-dim mt-1">{t.product.securePayment}</div>
        </div>
      </div>
    </div>
  );
}
