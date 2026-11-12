import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAsync } from '../../hooks/useAsync';
import type { OrderStatus, PaymentStatus } from '../../lib/database.types';
import { ApiError, deleteOrder, getOrder, updateOrder } from '../../lib/api/admin';
import { label, ORDER_STATUSES, PAYMENT_STATUSES } from '../../lib/admin/labels';
import { formatDay, formatDayRange, formatKES, formatLongDate } from '../../lib/format';
import { formatKePhone } from '../../lib/phone';
import { whatsappLink } from '../../lib/whatsapp';
import { useAdmin } from '../auth';
import { confirmDeleteOrder } from '../confirmDeleteOrder';
import { Btn, Card, inputCls, LabeledField, Loading, Notice, PageHeader, StatusBadge } from '../components/ui';

const STATUS_MESSAGES: Partial<Record<OrderStatus, string>> = {
  confirmed: 'your order is confirmed',
  processing: 'your order is being prepared',
  out_for_delivery: 'your order is out for delivery today',
  delivered: 'your order has been delivered. Thank you for shopping with us',
  cancelled: 'your order has been cancelled',
};

export default function OrderDetailPage() {
  const { id = '' } = useParams();
  const { data, loading, error, reload } = useAsync(() => getOrder(id), [id]);
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [payment, setPayment] = useState<PaymentStatus>('unpaid');
  const [method, setMethod] = useState('');
  const [deposit, setDeposit] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { isOwner } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!data) return;
    setStatus(data.order.status);
    setPayment(data.order.payment_status);
    setMethod(data.order.payment_method ?? '');
    setDeposit(String(data.order.deposit_amount));
    setNotes(data.order.internal_notes ?? '');
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error || !data) return <Notice kind="error">{error?.message ?? 'Order not found.'}</Notice>;
  const { order, items, customer, zone } = data;
  const cancelled = order.status === 'cancelled';

  const save = async () => {
    const dep = Number(deposit);
    if (!(dep >= 0) || dep > order.total) {
      setMsg({ kind: 'error', text: 'Deposit must be between 0 and the order total.' });
      return;
    }
    if (status === 'cancelled' && !cancelled && !window.confirm('Cancel this order? Stock is returned to inventory, and a cancelled order cannot be re-opened.')) return;
    setSaving(true);
    setMsg(null);
    try {
      // Same meaning as at checkout: balance = total minus deposit; nothing left once paid in full or refunded.
      await updateOrder(order.id, {
        status,
        payment_status: payment,
        payment_method: method.trim() || null,
        deposit_amount: dep,
        balance_due: payment === 'paid' || payment === 'refunded' ? 0 : Math.max(order.total - dep, 0),
        internal_notes: notes.trim() || null,
      });
      setMsg({ kind: 'success', text: status === 'cancelled' && !cancelled ? 'Order cancelled and stock returned.' : 'Order updated.' });
      reload();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Could not update the order.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDeleteOrder(order)) return;
    setDeleting(true);
    setMsg(null);
    try {
      const num = await deleteOrder(order.id);
      navigate('/admin/orders', { replace: true, state: { notice: `Order ${num} deleted.` } });
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Could not delete the order.' });
      setDeleting(false);
    }
  };

  const firstName = customer?.full_name.split(' ')[0] ?? '';
  const waText = `Hello ${firstName}, this is Mandela Heritage Furniture about order ${order.order_number}: ${STATUS_MESSAGES[order.status] ?? 'we have an update on your order'}.${
    order.balance_due > 0 && !cancelled ? ` Balance due: ${formatKES(order.balance_due)}.` : ''
  }`;

  return (
    <>
      <PageHeader
        title={`Order ${order.order_number}`}
        description={`Placed ${formatLongDate(order.created_at)}`}
        actions={
          <>
            <Link to="/admin/orders" className="rounded-lg border border-paper-300 bg-white px-3.5 py-2 text-sm text-navy-800">Back</Link>
            <Link to={`/admin/orders/${order.id}/print?doc=invoice`} target="_blank" className="rounded-lg border border-paper-300 bg-white px-3.5 py-2 text-sm text-navy-800">Invoice</Link>
            <Link to={`/admin/orders/${order.id}/print?doc=packing`} target="_blank" className="rounded-lg border border-paper-300 bg-white px-3.5 py-2 text-sm text-navy-800">Packing slip</Link>
            {customer && (
              <a href={whatsappLink(customer.phone, waText)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#1f7a4d] px-3.5 py-2 text-sm text-white">
                Message on WhatsApp
              </a>
            )}
          </>
        }
      />
      {msg && <Notice kind={msg.kind} onDismiss={() => setMsg(null)}>{msg.text}</Notice>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
        <div className="space-y-6">
          <Card title="Items">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr><th className="py-1">Item</th><th>SKU</th><th className="text-right">Price</th><th className="text-right">Qty</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-paper-200">
                {items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2">
                      {i.product_id ? <Link to={`/admin/products/${i.product_id}`} className="font-medium text-navy-800 hover:underline">{i.product_name_snapshot}</Link> : <span className="font-medium">{i.product_name_snapshot}</span>}
                      {i.variant_label_snapshot && <span className="block text-xs text-muted">{i.variant_label_snapshot}</span>}
                    </td>
                    <td className="font-mono text-xs">{i.sku_snapshot}</td>
                    <td className="text-right">{formatKES(i.unit_price_snapshot)}</td>
                    <td className="text-right">{i.quantity}</td>
                    <td className="text-right font-medium">{formatKES(i.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <dl className="mt-3 ml-auto max-w-xs space-y-1 border-t border-paper-200 pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatKES(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Delivery ({zone?.name ?? '—'})</dt><dd>{order.delivery_fee ? formatKES(order.delivery_fee) : 'Free'}</dd></div>
              <div className="flex justify-between font-semibold text-navy-800"><dt>Total</dt><dd>{formatKES(order.total)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Deposit</dt><dd>{formatKES(order.deposit_amount)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Balance due</dt><dd>{formatKES(order.balance_due)}</dd></div>
            </dl>
          </Card>

          <Card title="Delivery">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted">Address</dt><dd>{order.delivery_address}, {order.delivery_city}</dd></div>
              <div><dt className="text-xs text-muted">Zone</dt><dd>{zone?.name}</dd></div>
              <div><dt className="text-xs text-muted">Expected</dt><dd>{order.estimated_delivery_from && order.estimated_delivery_to ? formatDayRange(order.estimated_delivery_from, order.estimated_delivery_to) : '—'}</dd></div>
              <div><dt className="text-xs text-muted">Preferred date</dt><dd>{order.preferred_delivery_date ? formatDay(order.preferred_delivery_date) : '—'}</dd></div>
              {order.notes && <div className="sm:col-span-2"><dt className="text-xs text-muted">Customer notes</dt><dd className="whitespace-pre-line">{order.notes}</dd></div>}
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Status and payment">
            <div className="mb-3 flex gap-2"><StatusBadge value={order.status} /><StatusBadge value={order.payment_status} /></div>
            <div className="space-y-3">
              <LabeledField label="Order status" hint={cancelled ? 'Cancelled orders are final.' : 'Cancelling returns stock to inventory.'}>
                {(fid) => (
                  <select id={fid} className={inputCls} value={status} disabled={cancelled} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                    {ORDER_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                  </select>
                )}
              </LabeledField>
              <LabeledField label="Payment status">
                {(fid) => (
                  <select id={fid} className={inputCls} value={payment} onChange={(e) => setPayment(e.target.value as PaymentStatus)}>
                    {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                  </select>
                )}
              </LabeledField>
              <LabeledField label="Payment method and reference" hint="e.g. M-Pesa QJK3XYZ12, bank transfer">
                {(fid) => <input id={fid} className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)} />}
              </LabeledField>
              <LabeledField label="Deposit (KES)">
                {(fid) => <input id={fid} inputMode="decimal" className={inputCls} value={deposit} onChange={(e) => setDeposit(e.target.value)} />}
              </LabeledField>
              <LabeledField label="Internal notes" hint="Only visible to staff.">
                {(fid) => <textarea id={fid} rows={4} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />}
              </LabeledField>
              <Btn onClick={() => void save()} disabled={saving} className="w-full">{saving ? 'Saving…' : 'Save changes'}</Btn>
            </div>
          </Card>

          {customer && (
            <Card title="Customer" actions={<Link to={`/admin/customers/${customer.id}`} className="text-xs underline">Profile</Link>}>
              <p className="font-medium text-navy-800">{customer.full_name}</p>
              <p className="text-sm"><a href={`tel:${customer.phone}`} className="underline">{formatKePhone(customer.phone)}</a></p>
              {customer.email && <p className="text-sm"><a href={`mailto:${customer.email}`} className="underline">{customer.email}</a></p>}
            </Card>
          )}

          {isOwner && (
            <Card title="Delete order">
              <p className="text-sm text-muted">
                For test, duplicate or spam orders. {order.status === 'cancelled' || order.status === 'delivered' ? 'Stock is not changed.' : 'Its items go back into stock first.'} This cannot be undone.
              </p>
              <Btn variant="danger" className="mt-3 w-full" disabled={deleting} onClick={() => void remove()}>
                {deleting ? 'Deleting…' : 'Delete order permanently'}
              </Btn>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
