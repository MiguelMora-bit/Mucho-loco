import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { formatDate } from '@/lib/dates';
import { formatPrice } from '@/lib/pricing';
import { PAY_ICON, payLabels } from '../paymentMethodIcons';
import type { Lang, Order, Translations } from '@mucho-loco/types';

interface OrderDetailModalProps {
  t: Translations;
  lang: Lang;
  order: Order | null;
  onClose: () => void;
}

export function OrderDetailModal({ t, lang, order, onClose }: OrderDetailModalProps) {
  if (!order) return null;

  return (
    <div className="qr-full" onClick={onClose}>
      <div
        className="w-[440px] max-w-[90vw] max-h-[90vh] overflow-y-auto bg-ml-card border border-ml-border p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs text-ml-cream-dim uppercase tracking-[0.12em]">
            {order.id} · {formatDate(order.date, lang)}
          </span>
          <span className={'status ' + order.status}>
            {order.status === 'ready' ? t.dashboard.orders.ready : t.dashboard.orders.delivered}
          </span>
        </div>

        <div className="flex flex-col gap-1.5 mb-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex gap-2.5 items-center px-3 py-1.5 bg-ml-card-2">
              <Image src={item.img} width={36} height={36} className="w-[36px] h-[36px] object-cover" alt="" />
              <div>
                <b className="text-[13px]">{item.name} {item.qty > 1 && `× ${item.qty}`}</b>
                <small className="text-11 text-ml-cream-dim block">{item.flav}</small>
              </div>
            </div>
          ))}
        </div>

        <div className="font-display text-[24px] text-ml-red mb-3">{formatPrice(order.total)} MXN</div>

        <div className="flex items-center justify-between py-2 border-t border-ml-border">
          <span className="font-mono text-10 text-ml-cream-dim uppercase tracking-wide-xl">{t.dashboard.orders.paymentMethodLabel}</span>
          <span className="flex items-center gap-2">
            {PAY_ICON[order.paymentMethod]}
            <span className="font-bebas tracking-[0.06em] text-sm">{payLabels(t)[order.paymentMethod]}</span>
          </span>
        </div>

        {order.status === 'ready' ? (
          <div className="mt-1 pt-3 border-t border-ml-border text-center">
            <div className="bg-white p-4 inline-block">
              <QRCodeSVG value={order.id} size={140} marginSize={0} level="M" />
            </div>
            <p className="text-ml-cream-dim mt-2 text-sm">
              {t.dashboard.orders.pickupNote} <b className="text-ml-cream">{order.branch}</b>
            </p>
          </div>
        ) : (
          <div className="mt-1 pt-3 border-t border-ml-border text-sm text-ml-cream-dim">
            {t.dashboard.orders.deliveredBranchPrefix} <b className="text-ml-cream">{order.branch}</b>{' '}
            {t.dashboard.orders.deliveredAtPrefix}{' '}
            <b className="text-ml-cream">
              {order.deliveredAt && formatDate(order.deliveredAt, lang, { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </b>
          </div>
        )}

        <button onClick={onClose} className="mt-4 w-full px-7 py-2.5 border border-ml-border text-ml-cream font-bebas text-lg bg-transparent cursor-pointer">
          {t.dashboard.orders.close}
        </button>
      </div>
    </div>
  );
}
