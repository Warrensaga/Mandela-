import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAsync } from '../../hooks/useAsync';
import type { CategoryRow, ProductRow } from '../../lib/database.types';
import { adjustStock, ApiError, createProduct, getProduct, listAllCategories, updateProduct, type ProductInput } from '../../lib/api/admin';
import { slugify } from '../../lib/admin/labels';
import { formatKES } from '../../lib/format';
import { Btn, Card, inputCls, LabeledField, Loading, Notice, PageHeader, StockPill, Toggle } from '../components/ui';
import { ProductImages } from './product/ProductImages';
import { VariationEditor } from './product/VariationEditor';

type Form = Record<'name' | 'slug' | 'description' | 'category_id' | 'price' | 'compare_at_price' | 'sku' | 'low_stock_threshold' | 'dimensions' | 'materials' | 'room' | 'colour' | 'lead_time_days' | 'badge' | 'initial_stock', string> &
  Record<'is_active' | 'is_featured' | 'is_made_to_order' | 'free_delivery', boolean>;

const EMPTY: Form = {
  name: '', slug: '', description: '', category_id: '', price: '', compare_at_price: '', sku: '', low_stock_threshold: '5',
  dimensions: '', materials: '', room: '', colour: '', lead_time_days: '0', badge: '', initial_stock: '0',
  is_active: true, is_featured: false, is_made_to_order: false, free_delivery: false,
};

function fromRow(p: ProductRow): Form {
  return {
    name: p.name, slug: p.slug, description: p.description ?? '', category_id: p.category_id, price: String(p.price),
    compare_at_price: p.compare_at_price === null ? '' : String(p.compare_at_price), sku: p.sku ?? '',
    low_stock_threshold: String(p.low_stock_threshold), dimensions: p.dimensions ?? '', materials: p.materials ?? '',
    room: p.room ?? '', colour: p.colour ?? '', lead_time_days: String(p.lead_time_days), badge: p.badge ?? '', initial_stock: '0',
    is_active: p.is_active, is_featured: p.is_featured, is_made_to_order: p.is_made_to_order, free_delivery: p.free_delivery,
  };
}

function validate(f: Form): string[] {
  const e: string[] = [];
  if (!f.name.trim()) e.push('Name is required.');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) e.push('Slug may only use lowercase letters, numbers and single dashes.');
  if (!f.category_id) e.push('Choose a category.');
  if (!(Number(f.price) > 0)) e.push('Price must be above 0.');
  if (f.compare_at_price && !(Number(f.compare_at_price) > 0)) e.push('Compare-at price must be above 0.');
  if (!/^\d+$/.test(f.low_stock_threshold)) e.push('Low-stock threshold must be a whole number.');
  if (!/^\d+$/.test(f.lead_time_days)) e.push('Lead time must be a whole number of days.');
  if (!/^\d+$/.test(f.initial_stock)) e.push('Opening stock must be a whole number.');
  if (f.badge.length > 30) e.push('Badge must be 30 characters or fewer.');
  return e;
}

function toInput(f: Form): ProductInput {
  const t = (s: string) => s.trim() || null;
  return {
    name: f.name.trim(), slug: f.slug, description: t(f.description), category_id: f.category_id, price: Number(f.price),
    compare_at_price: f.compare_at_price ? Number(f.compare_at_price) : null, sku: t(f.sku), stock_quantity: 0,
    low_stock_threshold: Number(f.low_stock_threshold), is_active: f.is_active, is_featured: f.is_featured,
    dimensions: t(f.dimensions), materials: t(f.materials), room: t(f.room), colour: t(f.colour),
    lead_time_days: Number(f.lead_time_days), is_made_to_order: f.is_made_to_order, free_delivery: f.free_delivery, badge: t(f.badge),
  };
}

function CategorySelect({ id, value, onChange, categories }: { id: string; value: string; onChange: (v: string) => void; categories: CategoryRow[] }) {
  const parents = categories.filter((c) => !c.parent_id);
  return (
    <select id={id} className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose…</option>
      {parents.map((p) => {
        const kids = categories.filter((c) => c.parent_id === p.id);
        return kids.length ? (
          <optgroup key={p.id} label={p.name}>
            {kids.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_active ? '' : ' (inactive)'}</option>)}
          </optgroup>
        ) : (
          <option key={p.id} value={p.id}>{p.name}</option>
        );
      })}
    </select>
  );
}

export default function ProductEditPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const categories = useAsync(listAllCategories, []);
  const data = useAsync(() => (isNew ? Promise.resolve(null) : getProduct(id as string)), [id]);
  const [form, setForm] = useState<Form>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState(data.data?.images ?? []);

  useEffect(() => {
    if (data.data) {
      setForm(fromRow(data.data.product));
      setImages(data.data.images);
      setSlugTouched(true);
    }
  }, [data.data]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v, ...(k === 'name' && !slugTouched ? { slug: slugify(String(v)) } : {}) }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    setMessage(null);
    if (errs.length) return;
    setSaving(true);
    try {
      if (isNew) {
        const newId = await createProduct(toInput(form));
        const opening = Number(form.initial_stock);
        if (opening > 0) await adjustStock({ productId: newId, variantId: null, change: opening, reason: 'restock', note: 'Opening stock' });
        navigate(`/admin/products/${newId}`, { replace: true });
      } else {
        const { stock_quantity: _ignored, ...patch } = toInput(form);
        await updateProduct(id as string, patch);
        setMessage('Saved.');
        data.reload();
      }
    } catch (err) {
      setErrors([err instanceof ApiError ? err.message : 'Could not save.']);
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && data.loading && !data.data) return <Loading />;
  if (data.error) return <Notice kind="error">{data.error.message}</Notice>;
  const product = data.data?.product;

  const text = (k: keyof Form, labelText: string, opts: { hint?: string; inputMode?: 'numeric' | 'decimal'; className?: string; placeholder?: string } = {}) => (
    <LabeledField label={labelText} hint={opts.hint} className={opts.className}>
      {(fid) => (
        <input
          id={fid}
          className={inputCls}
          inputMode={opts.inputMode}
          placeholder={opts.placeholder}
          value={form[k] as string}
          onChange={(e) => {
            if (k === 'slug') setSlugTouched(true);
            set(k, e.target.value as never);
          }}
        />
      )}
    </LabeledField>
  );

  return (
    <>
      <PageHeader
        title={isNew ? 'New product' : (product?.name ?? 'Product')}
        description={isNew ? 'Save the details first, then add photos and variations.' : undefined}
        actions={
          <>
            <Link to="/admin/products" className="rounded-lg border border-paper-300 bg-white px-3.5 py-2 text-sm text-navy-800">Back</Link>
            {product && product.is_active && (
              <a href={`/product/${product.slug}`} target="_blank" rel="noopener" className="rounded-lg border border-paper-300 bg-white px-3.5 py-2 text-sm text-navy-800">
                View in shop
              </a>
            )}
          </>
        }
      />
      {message && <Notice kind="success" onDismiss={() => setMessage(null)}>{message}</Notice>}
      {errors.length > 0 && (
        <Notice kind="error">
          <ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </Notice>
      )}

      <form onSubmit={submit} className="space-y-6">
        <Card title="Details">
          <div className="grid gap-4 md:grid-cols-2">
            {text('name', 'Name')}
            {text('slug', 'URL slug', { hint: `Shop address: /product/${form.slug || '…'}` })}
            <LabeledField label="Description" className="md:col-span-2">
              {(fid) => <textarea id={fid} rows={4} className={inputCls} value={form.description} onChange={(e) => set('description', e.target.value)} />}
            </LabeledField>
            <LabeledField label="Category">
              {(fid) => <CategorySelect id={fid} value={form.category_id} onChange={(v) => set('category_id', v)} categories={categories.data ?? []} />}
            </LabeledField>
            {text('room', 'Room', { placeholder: 'Living Room, Bedroom…', hint: 'Used by the Room filter.' })}
            {text('price', product?.has_variants ? 'Base price (KES)' : 'Price (KES)', { inputMode: 'decimal', hint: product?.has_variants ? 'Used for variants without their own price.' : undefined })}
            {text('compare_at_price', 'Compare-at price (KES)', { inputMode: 'decimal', hint: 'Shown struck through when higher than the price.' })}
            {text('sku', 'SKU', { hint: product?.has_variants ? 'Also the prefix for generated variant SKUs.' : undefined })}
            {text('badge', 'Badge', { placeholder: 'New, Sale…' })}
            {text('materials', 'Materials')}
            {text('dimensions', 'Dimensions')}
            {text('colour', 'Colour', { hint: 'For simple products. Variant products use their Colour option.' })}
            {text('lead_time_days', 'Lead time (days)', { inputMode: 'numeric', hint: 'Workshop time before delivery. 0 for in-stock items.' })}
            {text('low_stock_threshold', 'Low-stock alert at', { inputMode: 'numeric' })}
            {isNew && text('initial_stock', 'Opening stock', { inputMode: 'numeric', hint: 'For simple products. Logged as a restock.' })}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            <Toggle label="Active (visible in shop)" checked={form.is_active} onChange={(v) => set('is_active', v)} />
            <Toggle label="Featured on home page" checked={form.is_featured} onChange={(v) => set('is_featured', v)} />
            <Toggle label="Made to order" checked={form.is_made_to_order} onChange={(v) => set('is_made_to_order', v)} />
            <Toggle label="Free delivery" checked={form.free_delivery} onChange={(v) => set('free_delivery', v)} />
          </div>
          <div className="mt-5">
            <Btn type="submit" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create product' : 'Save details'}</Btn>
          </div>
        </Card>
      </form>

      {product && data.data && (
        <div className="mt-6 space-y-6">
          {!product.has_variants && (
            <Card title="Stock">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <StockPill stock={product.stock_quantity} threshold={product.low_stock_threshold} madeToOrder={product.is_made_to_order} />
                <span className="text-muted">Change stock on the <Link to="/admin/inventory" className="underline">Inventory</Link> page so every change is logged. Price {formatKES(product.price)}.</span>
              </div>
            </Card>
          )}
          <ProductImages productId={product.id} productName={product.name} images={images} onChange={setImages} />
          <div>
            <h2 className="mb-2 font-serif text-2xl font-semibold text-navy-800">Variations</h2>
            <p className="mb-4 text-sm text-muted">
              {product.has_variants
                ? 'This product is sold in variations. Stock and price are set per variant.'
                : 'Optional. Add options such as Size or Colour to sell this product in variations. Its single stock level will then no longer be used.'}
            </p>
            <VariationEditor
              productId={product.id}
              basePrice={product.price}
              options={data.data.options}
              variants={data.data.variants}
              images={images}
              reload={data.reload}
            />
          </div>
        </div>
      )}
    </>
  );
}
