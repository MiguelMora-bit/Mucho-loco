'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { PRODUCTS, PRODUCT_CATS } from '../../../../lib/data';
import type { Lang } from '@mucho-loco/types';

export default function ProductoPage() {
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
  const lang = locale as Lang;
  const product = PRODUCTS.find(p => p.id === id);
  const [qty, setQty] = useState(1);
  const [wishlist, setWishlist] = useState(false);
  const [added, setAdded] = useState(false);

  if (!product) {
    return (
      <div className="px-8 py-20 text-center">
        <h1 className="font-display text-5xl">PRODUCTO NO ENCONTRADO</h1>
        <Link href="/" className="text-ml-red font-mono text-sm">← VOLVER A LA TIENDA</Link>
      </div>
    );
  }

  const siblings = PRODUCTS.filter(p => p.cat === product.cat && p.id !== product.id).slice(0, 4);
  const catLabel = PRODUCT_CATS[lang][product.cat] || product.cat.toUpperCase();

  function handleAdd() {
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="bg-ml-black pb-20">
      <nav className="pd-nav">
        <Link className="brand" href="/">
          <img src="/assets/bull-head.png" alt="" />
          <div className="name">MUCHO <span>LOCO</span></div>
        </Link>
        <span className="crumbs">
          <Link href="/">{lang === 'es' ? 'Tienda' : 'Store'}</Link> · {catLabel} · {product.name}
        </span>
        <span className="grow" />
        <Link href="/" className="back">← {lang === 'es' ? 'VOLVER' : 'BACK'}</Link>
      </nav>

      <div className="pd-wrap">
        <div className="pd-main">
          <div className="gallery">
            <div className="main-img">
              {product.tag && (
                <div className={`absolute top-4 left-4 px-3 py-[6px] font-mono text-[11px] tracking-wide-2xl z-[2] ${product.tag === 'HOT' ? 'bg-ml-red-bright text-white' : product.tag === 'NEW' ? 'bg-ml-yellow text-ml-black' : 'bg-ml-red text-white'}`}>
                  {product.tag}
                </div>
              )}
              <img src={product.img} alt={product.name} />
            </div>
          </div>

          <div className="pd-info">
            <span className="cat-eyebrow">{catLabel}</span>
            <h1>{product.name}</h1>
            <div className="flav-label">{product.flav}</div>
            <div className="price-row">
              <div className="price">${product.price.toLocaleString()}<small className="text-ml-cream-dim text-lg ml-1.5">MXN</small></div>
            </div>
            <div className="qty-row">
              <div className="qty-ctrl">
                <button onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span>{qty}</span>
                <button onClick={() => setQty(q => q + 1)}>+</button>
              </div>
              <span className="text-ml-cream-dim text-xs font-mono">× ${(product.price * qty).toLocaleString()} total</span>
            </div>
            <div className="pd-actions">
              <button className={'add-btn-main' + (added ? ' done' : '')} onClick={handleAdd}>
                {added
                  ? `✓ ${lang === 'es' ? 'AGREGADO AL CARRITO' : 'ADDED TO BAG'}`
                  : `🔥 ${lang === 'es' ? 'AGREGAR AL CARRITO' : 'ADD TO BAG'}`}
              </button>
              <button className={'wishlist-btn' + (wishlist ? ' active' : '')} onClick={() => setWishlist(w => !w)}>
                {wishlist ? '♥' : '♡'}
              </button>
            </div>
            <div className="mt-6 p-[18px] bg-ml-card border border-ml-border grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="font-display text-[22px] text-ml-orange">🏪</div>
                <div className="text-[11px] font-mono text-ml-cream-dim mt-1">{lang === 'es' ? 'RETIRO EN SUCURSAL' : 'BRANCH PICKUP'}</div>
              </div>
              <div className="text-center">
                <div className="font-display text-[22px] text-ml-orange">📦</div>
                <div className="text-[11px] font-mono text-ml-cream-dim mt-1">{lang === 'es' ? 'ENVÍO A DOMICILIO' : 'HOME DELIVERY'}</div>
              </div>
              <div className="text-center">
                <div className="font-display text-[22px] text-ml-orange">🔒</div>
                <div className="text-[11px] font-mono text-ml-cream-dim mt-1">{lang === 'es' ? 'PAGO SEGURO' : 'SECURE PAYMENT'}</div>
              </div>
            </div>
          </div>
        </div>

        {siblings.length > 0 && (
          <div className="mt-16">
            <div className="font-display text-[32px] mb-6">
              {lang === 'es' ? 'MÁS DE' : 'MORE FROM'} <span className="text-ml-red">{lang === 'es' ? 'LA CATEGORÍA' : 'THE CATEGORY'}</span>
            </div>
            <div className="related-grid">
              {siblings.map(p => (
                <Link key={p.id} href={`/producto/${p.id}` as '/producto/[id]'} className="related-card">
                  <img src={p.img} alt={p.name} />
                  <div className="rc-body">
                    <div className="rc-name">{p.name}</div>
                    <div className="text-[11px] text-ml-cream-dim font-mono mt-0.5">{p.flav}</div>
                    <div className="rc-price">${p.price}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
