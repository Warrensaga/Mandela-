import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useAsync } from '../../hooks/useAsync';
import { getOrder, listSettings } from '../../lib/api/admin';
import { label } from '../../lib/admin/labels';
import { formatDay, formatDayRange, formatKES, formatLongDate } from '../../lib/format';
import { formatKePhone } from '../../lib/phone';
import { Loading, Notice } from '../components/ui';

/** Printable invoice or packing slip. Opens the print dialog once loaded. */
export default function OrderPrintPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const doc = params.get('doc') === 'packing' ? 'packing' : 'invoice';
  const order = useAsync(() => getOrder(id), [id]);
  const settings = useAsync(listSettings, []);

  useEffect(() => {
    if (order.data && settings.data) {
      const t = window.setTimeout(() => window.print(), 400);
      return () => window.clearTimeout(t);
    }
  }, [order.data, settings.data]);

  if (order.error) return <Notice kind="error">{order.error.message}</Notice>;
  if (!order.data || !settings.data) return <Loading />;

  const s = new Map(settings.data.map((r) => [r.key, r.value]));
  const storeName = typeof s.get('store_name') === 'string' ? (s.get('store_name') as string) : 'Mandela Heritage Furniture';
  const contact = (s.get('contact') ?? {}) as Record<string, string | null>;
  const pay = (s.get('payment_instructions') ?? {}) as Record<string, unknown>;
  const paybill = (pay.mpesa_paybill ?? {}) as Record<string, string>;
  const { order: o, items, customer, zone } = order.data;

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-sm text-ink print:p-0">
      <title>{`${doc === 'invoice' ? 'Invoice' : 'Packing slip'} ${o.order_number}`}</title>
      <style>{'@page { margin: 16mm } @media print { body { background: white } }'}</style>
      <div className="flex items-start justify-between border-b border-ink/20 pb-4">
        <div>
          <p className="font-serif text-3xl font-semibold">{storeName}</p>
          <p className="text-xs text-muted">{[contact.address, contact.phone, contact.email].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold uppercase">{doc === 'invoice' ? 'Invoice' : 'Packing slip'}</p>
          <p>{o.order_number}</p>
          <p className="text-xs text-muted">{formatLongDate(o.created_at)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold uppercase text-muted">{doc === 'invoice' ? 'Bill to' : 'Deliver to'}</p>
          <p className="font-medium">{customer?.full_name}</p>
          <p>{customer ? formatKePhone(customer.phone) : ''}</p>
          <p>{o.delivery_address}</p>
          <p>{o.delivery_city}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-muted">Delivery</p>
          <p>{zone?.name}</p>
          <p>
            {o.preferred_delivery_date
              ? `Preferred: ${formatDay(o.preferred_delivery_date)}`
              : o.estimated_delivery_from && o.estimated_delivery_to
                ? `Expected: ${formatDayRange(o.estimated_delivery_from, o.estimated_delivery_to)}`
                : ''}
          </p>
          {doc === 'invoice' && <p>Payment: {label(o.payment_status)}{o.payment_method ? ` (${o.payment_method})` : ''}</p>}
        </div>
      </div>

      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr className="border-b border-ink/30 text-left text-xs uppercase text-muted">
            <th className="py-1.5">Item</th>
            <th>SKU</th>
            <th className="text-right">Qty</th>
            {doc === 'invoice' && <th className="text-right">Unit price</th>}
            {doc === 'invoice' && <th className="text-right">Total</th>}
            {doc === 'packing' && <th className="w-16 text-center">Packed</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b border-ink/10">
              <td className="py-2">
                {i.product_name_snapshot}
                {i.variant_label_snapshot && <span className="block text-xs text-muted">{i.variant_label_snapshot}</span>}
              </td>
              <td className="font-mono text-xs">{i.sku_snapshot}</td>
              <td className="text-right">{i.quantity}</td>
              {doc === 'invoice' && <td className="text-right">{formatKES(i.unit_price_snapshot)}</td>}
              {doc === 'invoice' && <td className="text-right">{formatKES(i.line_total)}</td>}
              {doc === 'packing' && <td className="text-center">☐</td>}
            </tr>
          ))}
        </tbody>
      </table>

      {doc === 'invoice' ? (
        <>
          <dl className="mt-4 ml-auto w-64 space-y-1">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatKES(o.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{o.delivery_fee ? formatKES(o.delivery_fee) : 'Free'}</dd></div>
            <div className="flex justify-between border-t border-ink/30 pt-1 font-semibold"><dt>Total</dt><dd>{formatKES(o.total)}</dd></div>
            {o.deposit_amount > 0 && <div className="flex justify-between"><dt>Deposit</dt><dd>{formatKES(o.deposit_amount)}</dd></div>}
            <div className="flex justify-between font-semibold"><dt>Balance due</dt><dd>{formatKES(o.balance_due)}</dd></div>
          </dl>
          <div className="mt-8 border-t border-ink/20 pt-3 text-xs text-muted">
            {paybill.business_number && <p>M-Pesa Paybill {paybill.business_number}, account {o.order_number}.</p>}
          </div>
        </>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-10 text-xs">
          <p className="border-t border-ink/40 pt-1">Packed by</p>
          <p className="border-t border-ink/40 pt-1">Received by (name, signature, date)</p>
        </div>
      )}
      {o.notes && <p className="mt-6 text-xs"><span className="font-semibold">Customer notes:</span> {o.notes}</p>}
      <button type="button" onClick={() => window.print()} className="mt-8 rounded-lg border border-ink/20 px-4 py-2 print:hidden">Print</button>
    </div>
  );
}
