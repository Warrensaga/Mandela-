import { useMemo, useState } from 'react';
import type { ProductImageRow, ProductOptionRow, ProductVariantRow } from '../../../lib/database.types';
import {
  adjustStock,
  ApiError,
  generateVariants,
  getOptionUsage,
  saveOptions,
  setSortOrder,
  updateVariants,
  type VariantPatch,
} from '../../../lib/api/admin';
import {
  combinationCount,
  newKey,
  removalWarnings,
  toEditable,
  toPayload,
  validateOptions,
  type EditableOption,
} from '../../../lib/admin/variantMatrix';
import { formatKES } from '../../../lib/format';
import { Badge, Btn, Card, Empty, inputCls, Modal, Notice } from '../../components/ui';

interface Props {
  productId: string;
  basePrice: number;
  options: ProductOptionRow[];
  variants: ProductVariantRow[];
  images: ProductImageRow[];
  reload: () => void;
}

// ------------------------------------------------------------------ options

function OptionsEditor({ productId, options, reload }: Pick<Props, 'productId' | 'options' | 'reload'>) {
  const original = useMemo(() => options.map((o) => ({ name: o.name, values: o.values })), [options]);
  const [edited, setEdited] = useState<EditableOption[]>(() => toEditable(original));
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const dirty = JSON.stringify(toPayload(edited).options) !== JSON.stringify(original);
  const errors = validateOptions(edited);

  const update = (key: string, fn: (o: EditableOption) => EditableOption) => setEdited((list) => list.map((o) => (o.key === key ? fn(o) : o)));
  const moveOption = (i: number, dir: -1 | 1) =>
    setEdited((list) => {
      const next = [...list];
      const [o] = next.splice(i, 1);
      if (o) next.splice(i + dir, 0, o);
      return next;
    });

  const review = async () => {
    setError(null);
    if (errors.length) return;
    try {
      const usage = await getOptionUsage(productId);
      const warnings = removalWarnings(original, edited, usage);
      if (warnings.length) setConfirm(warnings);
      else await save();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not check option usage.');
    }
  };

  const save = async () => {
    setConfirm(null);
    setBusy(true);
    try {
      const r = await saveOptions(productId, toPayload(edited));
      setMessage(`Options saved. ${r.renamed} variant(s) renamed, ${r.deleted} deleted, ${r.deactivated} deactivated (they have past orders).`);
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save options.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="1. Options" actions={<span className="text-xs text-muted">{combinationCount(edited)} combinations</span>}>
      {message && <Notice kind="success" onDismiss={() => setMessage(null)}>{message}</Notice>}
      {error && <Notice kind="error" onDismiss={() => setError(null)}>{error}</Notice>}
      <p className="mb-3 text-xs text-muted">
        For example Size, Fabric, Colour or Finish. Renaming a value updates its variants. Removing a value deletes its variants, or deactivates them if they have past orders.
      </p>
      <div className="space-y-3">
        {edited.map((o, i) => (
          <div key={o.key} className="rounded-lg border border-paper-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label="Option name"
                className={`${inputCls} max-w-48`}
                value={o.name}
                placeholder="Option name, e.g. Size"
                onChange={(e) => update(o.key, (x) => ({ ...x, name: e.target.value }))}
              />
              {o.originalName && o.originalName !== o.name.trim() && <Badge tone="info">renamed from {o.originalName}</Badge>}
              <div className="ml-auto flex gap-1">
                <Btn variant="ghost" disabled={i === 0} onClick={() => moveOption(i, -1)} aria-label={`Move ${o.name} up`}>↑</Btn>
                <Btn variant="ghost" disabled={i === edited.length - 1} onClick={() => moveOption(i, 1)} aria-label={`Move ${o.name} down`}>↓</Btn>
                <Btn variant="danger" onClick={() => setEdited((list) => list.filter((x) => x.key !== o.key))}>Remove option</Btn>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {o.values.map((v) => (
                <span key={v.key} className="inline-flex items-center gap-1 rounded-lg border border-paper-300 bg-paper-50 pl-2">
                  <input
                    aria-label={`${o.name} value`}
                    className="w-28 bg-transparent py-1 text-sm focus:outline-none"
                    value={v.value}
                    onChange={(e) =>
                      update(o.key, (x) => ({ ...x, values: x.values.map((y) => (y.key === v.key ? { ...y, value: e.target.value } : y)) }))
                    }
                  />
                  <button
                    type="button"
                    className="px-2 py-1 text-muted hover:text-terracotta-600"
                    aria-label={`Remove value ${v.value}`}
                    onClick={() => update(o.key, (x) => ({ ...x, values: x.values.filter((y) => y.key !== v.key) }))}
                  >
                    ✕
                  </button>
                </span>
              ))}
              <Btn variant="secondary" onClick={() => update(o.key, (x) => ({ ...x, values: [...x.values, { key: newKey(), originalValue: null, value: '' }] }))}>
                + Value
              </Btn>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn variant="secondary" onClick={() => setEdited((l) => [...l, { key: newKey(), originalName: null, name: '', values: [{ key: newKey(), originalValue: null, value: '' }] }])}>
          + Add option
        </Btn>
        <Btn onClick={() => void review()} disabled={!dirty || busy || errors.length > 0}>
          {busy ? 'Saving…' : 'Save options'}
        </Btn>
        {dirty && <Btn variant="ghost" onClick={() => setEdited(toEditable(original))}>Undo changes</Btn>}
      </div>
      {dirty && errors.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-xs text-terracotta-600">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title="Confirm option changes"
        footer={
          <>
            <Btn variant="secondary" onClick={() => setConfirm(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={() => void save()}>Save anyway</Btn>
          </>
        }
      >
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {confirm?.map((w) => <li key={w}>{w}</li>)}
        </ul>
      </Modal>
    </Card>
  );
}

// ------------------------------------------------------------------ variants

interface RowEdit {
  sku: string;
  price: string;
  compare: string;
  stock: string;
  threshold: string;
  imageId: string;
}

function toEdit(v: ProductVariantRow): RowEdit {
  return {
    sku: v.sku ?? '',
    price: v.price === null ? '' : String(v.price),
    compare: v.compare_at_price === null ? '' : String(v.compare_at_price),
    stock: String(v.stock_quantity),
    threshold: String(v.low_stock_threshold),
    imageId: v.image_id ?? '',
  };
}

function validateRow(e: RowEdit): string | null {
  if (e.price && !(Number(e.price) > 0)) return 'Price must be above 0 (or blank to use the product price).';
  if (e.compare && !(Number(e.compare) > 0)) return 'Compare-at price must be above 0.';
  if (!/^\d+$/.test(e.stock)) return 'Stock must be a whole number, 0 or more.';
  if (!/^\d+$/.test(e.threshold)) return 'Low-stock threshold must be a whole number.';
  return null;
}

function label(options: ProductOptionRow[], v: ProductVariantRow): string {
  const ov = (v.option_values ?? {}) as Record<string, string>;
  const known = options.map((o) => ov[o.name]).filter(Boolean);
  return known.length ? known.join(' / ') : Object.values(ov).join(' / ');
}

function VariantsTable({ productId, basePrice, options, variants, images, reload }: Props) {
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');

  const current = (v: ProductVariantRow) => edits[v.id] ?? toEdit(v);
  const dirtyIds = variants.filter((v) => edits[v.id] && JSON.stringify(edits[v.id]) !== JSON.stringify(toEdit(v))).map((v) => v.id);
  const rowErrors = Object.fromEntries(dirtyIds.map((id) => [id, validateRow(edits[id] as RowEdit)]).filter(([, e]) => e));
  const set = (v: ProductVariantRow, patch: Partial<RowEdit>) => setEdits((m) => ({ ...m, [v.id]: { ...current(v), ...patch } }));
  const allSelected = variants.length > 0 && selected.size === variants.length;

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    try {
      setMessage(await fn());
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const saveEdits = () =>
    run(async () => {
      for (const id of dirtyIds) {
        const v = variants.find((x) => x.id === id) as ProductVariantRow;
        const e = edits[id] as RowEdit;
        const patch: VariantPatch = {
          sku: e.sku.trim() || null,
          price: e.price ? Number(e.price) : null,
          compare_at_price: e.compare ? Number(e.compare) : null,
          low_stock_threshold: Number(e.threshold),
          image_id: e.imageId || null,
        };
        await updateVariants([id], patch);
        const delta = Number(e.stock) - v.stock_quantity;
        if (delta !== 0) await adjustStock({ productId, variantId: id, change: delta, reason: delta > 0 ? 'restock' : 'adjustment', note: 'Variant editor' });
      }
      setEdits({});
      return `Saved ${dirtyIds.length} variant(s).`;
    });

  const ids = [...selected];
  const bulk = {
    price: () =>
      run(async () => {
        if (bulkPrice && !(Number(bulkPrice) > 0)) throw new ApiError('CONSTRAINT', 'Price must be above 0.');
        await updateVariants(ids, { price: bulkPrice ? Number(bulkPrice) : null });
        return `Price ${bulkPrice ? `set to ${formatKES(Number(bulkPrice))}` : 'reset to product price'} for ${ids.length} variant(s).`;
      }),
    stock: (sign: 1 | -1) =>
      run(async () => {
        const n = Number(bulkStock);
        if (!Number.isInteger(n) || n <= 0) throw new ApiError('INVALID_CHANGE', 'Enter a whole number above zero.');
        for (const id of ids) {
          await adjustStock({ productId, variantId: id, change: n * sign, reason: sign > 0 ? 'restock' : 'adjustment', note: 'Bulk edit' });
        }
        return `${sign > 0 ? 'Added' : 'Removed'} ${n} for ${ids.length} variant(s).`;
      }),
    active: (active: boolean) =>
      run(async () => {
        await updateVariants(ids, { is_active: active });
        return `${active ? 'Activated' : 'Deactivated'} ${ids.length} variant(s).`;
      }),
  };

  const generate = () =>
    run(async () => {
      const n = await generateVariants(productId);
      return n ? `Created ${n} new variant(s) with stock 0. Set their stock and prices below.` : 'All combinations already exist.';
    });

  const reorderBySort = () =>
    run(async () => {
      const sorted = [...variants].sort((a, b) => label(options, a).localeCompare(label(options, b)));
      await setSortOrder('product_variants', sorted.map((v) => v.id));
      return 'Variants sorted by name.';
    });

  return (
    <Card
      title="2. Variants"
      actions={
        <div className="flex flex-wrap gap-2">
          <Btn variant="secondary" onClick={() => void reorderBySort()} disabled={busy || variants.length < 2}>Sort A–Z</Btn>
          <Btn onClick={() => void generate()} disabled={busy || options.length === 0}>Generate variants</Btn>
        </div>
      }
    >
      {message && <Notice kind="success" onDismiss={() => setMessage(null)}>{message}</Notice>}
      {error && <Notice kind="error" onDismiss={() => setError(null)}>{error}</Notice>}
      <p className="mb-3 text-xs text-muted">
        Blank price uses the product price ({formatKES(basePrice)}). Stock changes are logged in inventory history. Variants with past orders can only be deactivated.
      </p>

      {variants.length === 0 ? (
        <Empty>{options.length ? 'No variants yet. Click "Generate variants".' : 'Add options above first.'}</Empty>
      ) : (
        <>
          {selected.size > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-paper-100 p-2 text-sm">
              <span className="font-medium">{selected.size} selected</span>
              <input aria-label="Bulk price" inputMode="decimal" placeholder="Price (blank = product)" className={`${inputCls} w-40`} value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} />
              <Btn variant="secondary" disabled={busy} onClick={() => void bulk.price()}>Set price</Btn>
              <input aria-label="Bulk stock quantity" inputMode="numeric" placeholder="Qty" className={`${inputCls} w-20`} value={bulkStock} onChange={(e) => setBulkStock(e.target.value.replace(/\D/g, ''))} />
              <Btn variant="secondary" disabled={busy} onClick={() => void bulk.stock(1)}>Add stock</Btn>
              <Btn variant="secondary" disabled={busy} onClick={() => void bulk.stock(-1)}>Remove stock</Btn>
              <Btn variant="secondary" disabled={busy} onClick={() => void bulk.active(true)}>Activate</Btn>
              <Btn variant="secondary" disabled={busy} onClick={() => void bulk.active(false)}>Deactivate</Btn>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="w-8 py-2">
                    <input
                      type="checkbox"
                      aria-label="Select all variants"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(variants.map((v) => v.id)))}
                      className="accent-brand-600"
                    />
                  </th>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Compare at</th>
                  <th>Stock</th>
                  <th>Low at</th>
                  <th>Photo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-200">
                {variants.map((v) => {
                  const e = current(v);
                  const err = rowErrors[v.id];
                  return (
                    <tr key={v.id} className={v.is_active ? '' : 'bg-paper-50 text-muted'}>
                      <td className="py-1.5">
                        <input
                          type="checkbox"
                          aria-label={`Select ${label(options, v)}`}
                          checked={selected.has(v.id)}
                          onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(v.id)) n.delete(v.id); else n.add(v.id); return n; })}
                          className="accent-brand-600"
                        />
                      </td>
                      <td className="pr-2 font-medium text-navy-800">
                        {label(options, v)}
                        {err && <p className="text-xs font-normal text-terracotta-600">{err}</p>}
                      </td>
                      <td className="pr-2"><input aria-label="SKU" className={`${inputCls} w-40 font-mono text-xs`} value={e.sku} onChange={(x) => set(v, { sku: x.target.value })} /></td>
                      <td className="pr-2"><input aria-label="Price" inputMode="decimal" placeholder={String(basePrice)} className={`${inputCls} w-24`} value={e.price} onChange={(x) => set(v, { price: x.target.value })} /></td>
                      <td className="pr-2"><input aria-label="Compare-at price" inputMode="decimal" className={`${inputCls} w-24`} value={e.compare} onChange={(x) => set(v, { compare: x.target.value })} /></td>
                      <td className="pr-2"><input aria-label="Stock" inputMode="numeric" className={`${inputCls} w-16`} value={e.stock} onChange={(x) => set(v, { stock: x.target.value })} /></td>
                      <td className="pr-2"><input aria-label="Low-stock threshold" inputMode="numeric" className={`${inputCls} w-14`} value={e.threshold} onChange={(x) => set(v, { threshold: x.target.value })} /></td>
                      <td className="pr-2">
                        <select aria-label="Variant photo" className={`${inputCls} w-28`} value={e.imageId} onChange={(x) => set(v, { imageId: x.target.value })}>
                          <option value="">Main photo</option>
                          {images.map((img, i) => (
                            <option key={img.id} value={img.id}>Photo {i + 1}</option>
                          ))}
                        </select>
                      </td>
                      <td>{v.is_active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Btn onClick={() => void saveEdits()} disabled={busy || dirtyIds.length === 0 || Object.keys(rowErrors).length > 0}>
              {busy ? 'Saving…' : `Save ${dirtyIds.length || ''} change${dirtyIds.length === 1 ? '' : 's'}`}
            </Btn>
            {dirtyIds.length > 0 && <Btn variant="ghost" onClick={() => setEdits({})}>Discard</Btn>}
          </div>
        </>
      )}
    </Card>
  );
}

export function VariationEditor(props: Props) {
  // Re-mount the options editor when saved options change, so it starts from the database state.
  const optionsKey = props.options.map((o) => `${o.name}:${o.values.join('|')}`).join(';');
  return (
    <div className="space-y-6">
      <OptionsEditor key={optionsKey} productId={props.productId} options={props.options} reload={props.reload} />
      <VariantsTable {...props} />
    </div>
  );
}
