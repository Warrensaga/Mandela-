import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAsync } from '../../hooks/useAsync';
import type { AdminInventoryRow, InventoryReason } from '../../lib/database.types';
import { adjustStock, ApiError, listInventory, listMovements } from '../../lib/api/admin';
import { dateStamp, downloadCsv } from '../../lib/admin/csv';
import { label, MANUAL_REASONS } from '../../lib/admin/labels';
import { formatLongDate } from '../../lib/format';
import { Btn, Empty, inputCls, Loading, Modal, Notice, PageHeader, StockPill } from '../components/ui';

type StockFilter = 'all' | 'low' | 'out' | 'ok';

function stockClass(r: AdminInventoryRow): StockFilter {
  const stock = r.stock_quantity ?? 0;
  if (r.is_made_to_order) return 'ok';
  if (stock <= 0) return 'out';
  if (stock <= (r.low_stock_threshold ?? 5)) return 'low';
  return 'ok';
}

const key = (r: AdminInventoryRow) => `${r.product_id}:${r.variant_id ?? ''}`;

function AdjustForm({ row, onDone }: { row: AdminInventoryRow; onDone: (newStock: number) => void }) {
  const [qty, setQty] = useState('');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [reason, setReason] = useState<InventoryReason>('restock');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0) {
      setError('Enter a whole number above zero.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const newStock = await adjustStock({ productId: row.product_id as string, variantId: row.variant_id, change: n * direction, reason, note });
      onDone(newStock);
      setQty('');
      setNote('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update stock.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Add or remove" className={`${inputCls} w-auto`} value={direction} onChange={(e) => setDirection(Number(e.target.value) as 1 | -1)}>
        <option value={1}>Add</option>
        <option value={-1}>Remove</option>
      </select>
      <input aria-label="Quantity" inputMode="numeric" className={`${inputCls} w-20`} value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} placeholder="Qty" />
      <select aria-label="Reason" className={`${inputCls} w-auto`} value={reason} onChange={(e) => setReason(e.target.value as InventoryReason)}>
        {MANUAL_REASONS.map((r) => (
          <option key={r} value={r}>{label(r)}</option>
        ))}
      </select>
      <input aria-label="Note" className={`${inputCls} w-40 flex-1`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
      <Btn onClick={() => void save()} disabled={busy || !qty}>
        {busy ? 'Saving…' : 'Save'}
      </Btn>
      {error && <p className="w-full text-xs text-terracotta-600">{error}</p>}
    </div>
  );
}

function History({ row }: { row: AdminInventoryRow }) {
  const { data, loading, error } = useAsync(
    () => listMovements({ productId: row.product_id as string, variantId: row.variant_id ?? null, limit: 100 }),
    [row.product_id, row.variant_id],
  );
  if (loading) return <Loading />;
  if (error) return <Notice kind="error">{error.message}</Notice>;
  if (!data?.length) return <Empty>No movements yet.</Empty>;
  return (
    <div className="overflow-x-auto">
    <table className="w-full min-w-[520px] text-sm">
      <thead className="text-left text-xs text-muted">
        <tr>
          <th className="py-1">Date</th>
          <th>Change</th>
          <th>Reason</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-paper-200">
        {data.map((m) => (
          <tr key={m.id}>
            <td className="py-1.5 whitespace-nowrap">{formatLongDate(m.created_at)}</td>
            <td className={m.change_quantity > 0 ? 'text-brand-700' : 'text-terracotta-600'}>
              {m.change_quantity > 0 ? '+' : ''}
              {m.change_quantity}
            </td>
            <td>{label(m.reason)}</td>
            <td className="text-muted">{m.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

export default function InventoryPage() {
  const [params, setParams] = useSearchParams();
  const stockFilter = (params.get('stock') as StockFilter | null) ?? 'all';
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [historyRow, setHistoryRow] = useState<AdminInventoryRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsync(listInventory, []);
  const [overrides, setOverrides] = useState<Map<string, number>>(new Map());

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? [])
      .map((r) => (overrides.has(key(r)) ? { ...r, stock_quantity: overrides.get(key(r)) as number } : r))
      .filter((r) => showInactive || r.is_active)
      .filter((r) => stockFilter === 'all' || stockClass(r) === stockFilter)
      .filter((r) => !q || [r.product_name, r.variant_label, r.sku].some((v) => v?.toLowerCase().includes(q)));
  }, [data, overrides, search, showInactive, stockFilter]);

  const exportCsv = () =>
    downloadCsv(
      `inventory-${dateStamp()}.csv`,
      ['Product', 'Variant', 'SKU', 'Stock', 'Low stock threshold', 'Active', 'Made to order'],
      rows.map((r) => [r.product_name, r.variant_label, r.sku, r.stock_quantity, r.low_stock_threshold, r.is_active ? 'yes' : 'no', r.is_made_to_order ? 'yes' : 'no']),
    );

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock per variant. Every change is logged with a reason."
        actions={
          <>
            <Btn variant="secondary" onClick={reload}>Refresh</Btn>
            <Btn variant="secondary" onClick={exportCsv} disabled={!rows.length}>Export CSV</Btn>
          </>
        }
      />
      {message && <Notice kind="success" onDismiss={() => setMessage(null)}>{message}</Notice>}
      {error && <Notice kind="error">{error.message}</Notice>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input type="search" aria-label="Search inventory" placeholder="Search product, variant or SKU" className={`${inputCls} max-w-xs`} value={search} onChange={(e) => setSearch(e.target.value)} />
        <select
          aria-label="Stock level"
          className={`${inputCls} w-auto`}
          value={stockFilter}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            if (e.target.value === 'all') next.delete('stock');
            else next.set('stock', e.target.value);
            setParams(next, { replace: true });
          }}
        >
          <option value="all">All stock levels</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
          <option value="ok">Healthy</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-navy-800">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="accent-brand-600" />
          Show inactive
        </label>
        <span className="text-sm text-muted">{rows.length} rows</span>
      </div>

      {loading && !data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>Nothing matches.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-paper-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-paper-50 text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Variant</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200">
              {rows.map((r) => {
                const k = key(r);
                return (
                  <tr key={k} className={r.is_active ? '' : 'opacity-60'}>
                    <td className="px-3 py-2 align-top">
                      <Link to={`/admin/products/${r.product_id}`} className="font-medium text-navy-800 hover:underline">
                        {r.product_name}
                      </Link>
                      {!r.is_active && <span className="ml-2 text-xs text-muted">(inactive)</span>}
                    </td>
                    <td className="px-3 py-2 align-top text-muted">{r.variant_label ?? '—'}</td>
                    <td className="px-3 py-2 align-top font-mono text-xs">{r.sku ?? '—'}</td>
                    <td className="px-3 py-2 align-top">
                      <StockPill stock={r.stock_quantity ?? 0} threshold={r.low_stock_threshold ?? 5} madeToOrder={r.is_made_to_order ?? false} />
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      {openRow === k ? (
                        <div className="text-left">
                          <AdjustForm
                            row={r}
                            onDone={(newStock) => {
                              setOverrides((m) => new Map(m).set(k, newStock));
                              setMessage(`${r.product_name}${r.variant_label ? ` (${r.variant_label})` : ''}: stock is now ${newStock}.`);
                              setOpenRow(null);
                            }}
                          />
                          <button type="button" className="mt-1 text-xs underline" onClick={() => setOpenRow(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Btn variant="secondary" onClick={() => setOpenRow(k)}>Adjust</Btn>
                          <Btn variant="ghost" onClick={() => setHistoryRow(r)}>History</Btn>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={historyRow !== null}
        onClose={() => setHistoryRow(null)}
        title={historyRow ? `History: ${historyRow.product_name}${historyRow.variant_label ? ` (${historyRow.variant_label})` : ''}` : ''}
        wide
      >
        {historyRow && <History row={historyRow} />}
      </Modal>
    </>
  );
}
