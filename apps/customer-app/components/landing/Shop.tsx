'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { PRODUCT_CATS } from '../../lib/data';
import { useCartStore } from '../../lib/stores/cart.store';
import type { Lang, Product, Translations } from '@mucho-loco/types';

interface ShopProps {
  t: Translations;
  lang: Lang;
  cat: string;
  setCat: (c: string) => void;
  products: Product[];
}

export function Shop({ t, lang, cat, setCat, products }: ShopProps) {
  const cats = PRODUCT_CATS[lang];
  const filtered = cat === 'all' ? products : products.filter((p) => p.cat === cat);
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);

  return (
    <section className="shop" id="shop">
      <div className="section-head">
        <div className="section-eyebrow">{t.shop.eyebrow}</div>
        <h2 className="section-title">{t.shop.titleA} <span className="red">{t.shop.titleB}</span></h2>
        <p className="section-sub">{t.shop.sub}</p>
        <div className="mt-6">
          <div className="mascot-quote">
            <Image src="/assets/bull-head.png" width={64} height={64} className="bull" alt="" />
            <span>&quot;{t.shop.quote}&quot;</span>
          </div>
        </div>
      </div>
      <div className="shop-controls">
        {Object.entries(cats).map(([key, name]) => (
          <button key={key} className={cat === key ? 'active' : ''} onClick={() => setCat(key)}>{name}</button>
        ))}
      </div>
      <div className="shop-grid">
        {filtered.map((p) => {
          const inCart = items.find((c) => c.id === p.id);
          return (
            <div key={p.id} className="product-card">
              <Link href={`/product/${p.id}`} className="no-underline text-inherit flex flex-col flex-1">
                <div className="product-img">
                  {p.tag && <div className={'product-tag ' + p.tag}>{p.tag}</div>}
                  <Image src={p.img} alt={p.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover" />
                </div>
                <div className="product-body">
                  <div className="product-name">{p.name}</div>
                  <div className="product-flav">{p.flav}</div>
                  <div className="product-row">
                    <div className="product-price">${p.price}</div>
                    <button
                      className={'add-btn' + (inCart ? ' added' : '')}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem(p); }}
                    >
                      {inCart ? `× ${inCart.qty}` : '+ ' + t.shop.add.toUpperCase()}
                    </button>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
