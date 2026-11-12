import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { useAsync } from '../../hooks/useAsync';
import type { OrderStatus, PaymentStatus } from '../../lib/database.types';
import { ApiError, deleteOrder, listOrders, type OrderListRow } from '../../lib/api/admin';
import { dateStamp, downloadCsv } from '../../lib/admin/csv';
import { label, ORDER_STATUSES, PAYMENT_STATUSES } from '../../lib/admin/labels';
import { formatKES, formatLongDate } from '../../lib/format';
import { useAdmin } from '../auth';
import { confirmDeleteOrder } from '../confirmDeleteOrder';
import { Btn, Empty, inputCls, Loading, Notice, PageHeader, StatusBadge } from '../components/ui';

const PAGE_SIZE = 25;

export default function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') ?? '') as OrderStatus | '';
  const payment = (params.get('payment') ?? '') as PaymentStatus | '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const search = params.get('q') ?? '';
  const page = Number(params.get('page') ?? 0);
  const [searchInput, setSearchInput] = useState(search);

  const { isOwner } = useAdmin();
  const location = useLocation();
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(
    (location.state as { notice?: string } | null)?.notice ? { kind: 'success', text: (location.state as { notice: string }).notice } : null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsync(
    () => listOrders({ status, payment, from, to, search, page, pageSize: PAGE_SIZE }),
    [status, payment, from, to, search, page],
  );

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const exportCsv = () =>
    downloadCsv(
      `orders-${dateStamp()}.csv`,
      ['Order', 'Date', 'Customer', 'Phone', 'Status', 'Payment', 'Zone', 'Subtotal', 'Delivery', 'Total', 'Deposit', 'Balance'],
      (data?.rows ?? []).map((o) => [o.order_number, o.created_at, o.customer?.full_name, o.customer?.phone, label(o.status), label(o.payment_status), o.zone_name, o.subtotal, o.delivery_fee, o.total, o.deposit_amount, o.balance_due]),
    );

  const remove = async (o: OrderListRow) => {
    if (!confirmDeleteOrder(o)) return;
    setBusyId(o.id);
    try {
      const num = await deleteOrder(o.id);
      setNotice({ kind: 'success', text: `Order ${num} deleted.` });
      reload();
    } catch (e) {
      setNotice({ kind: 'error', text: e instanceof ApiError ? e.message : 'Could not delete the order.' });
    } finally {
      setBusyId(null);
    }
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <PageHeader title="Orders" actions={<Btn variant="secondary" onClick={exportCsv} disabled={!data?.rows.length}>Export page as CSV</Btn>} />
      {error && <Notice kind="error">{error.message}</Notice>}
      {notice && <Notice kind={notice.kind} onDismiss={() => setNotice(null)}>{notice.text}</Notice>}
      <form
        className="mb-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setParam('q', searchInput.trim());
        }}
      >
        <input type="search" aria-label="Search orders" placeholder="Order number, name or phone" className={`${inputCls} max-w-xs`} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        <select aria-label="Status" className={`${inputCls} w-auto`} value={status} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <select aria-label="Payment" className={`${inputCls} w-auto`} value={payment} onChange={(e) => setParam('payment', e.target.value)}>
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <label className="text-xs text-muted">
          From
          <input type="date" className={`${inputCls} mt-0.5 w-auto`} value={from} onChange={(e) => setParam('from', e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          To
          <input type="date" className={`${inputCls} mt-0.5 w-auto`} value={to} onChange={(e) => setParam('to', e.target.value)} />
        </label>
        <Btn type="submit" variant="secondary">Search</Btn>
        {(status || payment || from || to || search) && (
          <Btn variant="ghost" onClick={() => { setSearchInput(''); setParams(new URLSearchParams(), { replace: true }); }}>Clear</Btn>
        )}
      </form>

      {loading && !data ? (
        <Loading />
      ) : !data?.rows.length ? (
        <Empty>No orders match.</Empty>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-paper-200 bg-white">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-paper-50 text-left text-xs text-muted">
                <tr>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Zone</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Payment</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  {isOwner && <th className="px-3 py-2"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-200">
                {data.rows.map((o) => (
                  <tr key={o.id} className="hover:bg-paper-50">
                    <td className="px-3 py-2"><Link to={`/admin/orders/${o.id}`} className="font-medium text-navy-800 underline-offset-2 hover:underline">{o.order_number}</Link></td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatLongDate(o.created_at)}</td>
                    <td className="px-3 py-2">{o.customer?.full_name}<span className="block text-xs text-muted">{o.customer?.phone}</span></td>
                    <td className="px-3 py-2">{o.zone_name}</td>
                    <td className="px-3 py-2"><StatusBadge value={o.status} /></td>
                    <td className="px-3 py-2"><StatusBadge value={o.payment_status} /></td>
                    <td className="px-3 py-2 text-right font-medium">{formatKES(o.total)}</td>
                    {isOwner && (
                      <td className="px-3 py-2 text-right">
                        <Btn variant="danger" disabled={busyId === o.id} onClick={() => void remove(o)} aria-label={`Delete order ${o.order_number}`}>
                          {busyId === o.id ? 'Deleting…' : 'Delete'}
                        </Btn>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted">{data.total} orders</span>
            <div className="flex items-center gap-2">
              <Btn variant="secondary" disabled={page === 0} onClick={() => setParam('page', String(page - 1))}>Previous</Btn>
              <span>Page {page + 1} of {pages}</span>
              <Btn variant="secondary" disabled={page + 1 >= pages} onClick={() => setParam('page', String(page + 1))}>Next</Btn>
            </div>
          </div>
        </>
      )}
    </>
  );
}
