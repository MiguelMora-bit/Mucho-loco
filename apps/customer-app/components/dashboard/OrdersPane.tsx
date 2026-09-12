import Image from 'next/image';
import { formatPrice } from '@/lib/pricing';
import { formatDate } from '@/lib/dates';
import { orderStatusLabel } from '@/lib/orderStatus';
import type { Lang, Order, Translations } from '@mucho-loco/types';

interface OrdersPaneProps {
  t: Translations;
  lang: Lang;
  active: boolean;
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}

export function OrdersPane({ t, lang, active, orders, onSelectOrder }: OrdersPaneProps) {
  return (
    <div className={'pane' + (active ? ' active' : '')}>
      {orders.map((order) => (
        <div key={order.id} className="order-card cursor-pointer" onClick={() => onSelectOrder(order)}>
          <div className="flex items-center justify-between mb-3.5">
            <span className="font-mono text-xs text-ml-cream-dim uppercase tracking-[0.12em]">{order.id} · {formatDate(order.date, lang)}</span>
            <span className={'status ' + order.status}>{orderStatusLabel(order.status, t)}</span>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            {order.items.map((item, i) => (
              <div key={i} className="flex gap-2.5 items-center px-3 py-2 bg-ml-card-2">
                <Image src={item.img} width={42} height={42} className="w-[42px] h-[42px] object-cover" alt="" />
                <div><b className="text-[13px]">{item.name} {item.qty > 1 && `× ${item.qty}`}</b><small className="text-11 text-ml-cream-dim block">{item.flav}</small></div>
              </div>
            ))}
          </div>
          <div className="font-display text-[28px] text-ml-red mt-2.5">{formatPrice(order.total)} MXN</div>
        </div>
      ))}
    </div>
  );
}
