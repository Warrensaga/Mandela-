import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAsync } from '../../hooks/useAsync';
import { listAllCategories, listProducts } from '../../lib/api/admin';
import { formatKES } from '../../lib/format';
import { Badge, Btn, Empty, inputCls, Loading, Notice, PageHeader, StockPill } from '../components/ui';

export default function ProductsPage() {
  const navigate = useNavigate();
  const products = useAsync(listProducts, []);
  const categories = useAsync(listAllCategories, []);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [category, setCategory] = useState('');

  const catName = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, c.name])), [categories.data]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products.data ?? []).filter(
      (p) =>
        (status === 'all' || (status === 'active') === Boolean(p.is_active)) &&
        (!category || p.category_id === category || (categories.data ?? []).find((c) => c.id === p.category_id)?.parent_id === category) &&
        (!q || p.name?.toLowerCase().includes(q) || p.slug?.includes(q)),
    );
  }, [products.data, search, status, category, categories.data]);

  return (
    <>
      <PageHeader
        title="Products"
        description="Deactivate products to hide them from the shop; they are never deleted, so past orders stay intact."
        actions={<Btn onClick={() => navigate('/admin/products/new')}>New product</Btn>}
      />
      {products.error && <Notice kind="error">{products.error.message}</Notice>}
      <div className="mb-4 flex flex-wrap gap-3">
        <input type="search" aria-label="Search products" placeholder="Search products" className={`${inputCls} max-w-xs`} value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Status" className={`${inputCls} w-auto`} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select aria-label="Category" className={`${inputCls} w-auto`} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {(categories.data ?? [])
            .filter((c) => !c.parent_id)
            .map((parent) => (
              <optgroup key={parent.id} label={parent.name}>
                <option value={parent.id}>All {parent.name}</option>
                {(categories.data ?? [])
                  .filter((c) => c.parent_id === parent.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </optgroup>
            ))}
        </select>
      </div>
      {products.loading && !products.data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>No products match.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-paper-200 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-paper-50 text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200">
              {rows.map((p) => (
                <tr key={p.id} className={p.is_active ? '' : 'bg-paper-50 text-muted'}>
                  <td className="px-3 py-2">
                    <Link to={`/admin/products/${p.id}`} className="flex items-center gap-3 hover:underline">
                      {p.primary_image_url ? (
                        <img src={p.primary_image_url} alt="" className="h-10 w-12 rounded object-cover" />
                      ) : (
                        <span className="h-10 w-12 rounded bg-paper-200" />
                      )}
                      <span className="font-medium text-navy-800">{p.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2">{p.category_id ? catName.get(p.category_id) : ''}</td>
                  <td className="px-3 py-2">
                    {p.has_variants && p.min_price !== p.max_price ? `${formatKES(p.min_price ?? 0)} – ${formatKES(p.max_price ?? 0)}` : formatKES(p.price ?? 0)}
                  </td>
                  <td className="px-3 py-2">
                    <StockPill stock={p.total_stock ?? 0} threshold={p.low_stock_threshold ?? 5} madeToOrder={p.is_made_to_order ?? false} />
                    {p.has_variants && <span className="ml-1 text-xs text-muted">({p.active_variant_count} variants)</span>}
                  </td>
                  <td className="space-x-1 px-3 py-2">
                    {!p.is_active && <Badge>Inactive</Badge>}
                    {p.is_featured && <Badge tone="info">Featured</Badge>}
                    {p.badge && <Badge tone="warning">{p.badge}</Badge>}
                    {p.free_delivery && <Badge tone="success">Free delivery</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
