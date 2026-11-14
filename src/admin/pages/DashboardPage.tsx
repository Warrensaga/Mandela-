import { Link } from 'react-router';
import { useAsync } from '../../hooks/useAsync';
import { fetchDashboard } from '../../lib/api/admin';
import { formatKES, formatLongDate } from '../../lib/format';
import { Card, Empty, Loading, Notice, PageHeader, StatusBadge, StockPill } from '../components/ui';

function Stat({ label, value, sub, to }: { label: string; value: string; sub?: string; to?: string }) {
  const body = (
    <div className="rounded-xl border border-paper-200 bg-white p-4 transition-colors hover:border-navy-200">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-navy-800">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}


const ordersLabel = (n: number) => `${n} ${n === 1 ? 'order' : 'orders'}`;

export default function DashboardPage() {
  const { data, error, loading, reload } = useAsync(fetchDashboard, []);

  return (
    <>
      <PageHeader title="Dashboard" description="Orders exclude cancelled orders. Times are Nairobi time." actions={<button type="button" onClick={reload} className="text-sm underline">Refresh</button>} />
      {error && <Notice kind="error">{error.message}</Notice>}
      {loading && !data && <Loading />}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Today" value={formatKES(data.today.revenue)} sub={ordersLabel(data.today.orders)} />
            <Stat label="This week" value={formatKES(data.week.revenue)} sub={ordersLabel(data.week.orders)} />
            <Stat label="This month" value={formatKES(data.month.revenue)} sub={ordersLabel(data.month.orders)} />
            <Stat label="Pending orders" value={String(data.pendingOrders)} sub={`${data.unpaidOrders} unpaid`} to="/admin/orders?status=pending" />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Low stock" value={String(data.lowStockCount)} to="/admin/inventory?stock=low" />
            <Stat label="Out of stock" value={String(data.outOfStockCount)} to="/admin/inventory?stock=out" />
            <Stat label="New custom requests" value={String(data.newCustomRequests)} to="/admin/custom-requests" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Recent orders" actions={<Link to="/admin/orders" className="text-xs underline">All orders</Link>}>
              {data.recentOrders.length === 0 ? (
                <Empty>No orders yet.</Empty>
              ) : (
                <ul className="divide-y divide-paper-200 text-sm">
                  {data.recentOrders.map((o) => (
                    <li key={o.id}>
                      <Link to={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 hover:bg-paper-50">
                        <span className="font-medium text-navy-800">{o.orderNumber}</span>
                        <span className="flex-1 truncate text-muted">{o.customerName}</span>
                        <StatusBadge value={o.status} />
                        <StatusBadge value={o.paymentStatus} />
                        <span className="w-28 text-right font-medium">{formatKES(o.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Stock alerts" actions={<Link to="/admin/inventory?stock=low" className="text-xs underline">Inventory</Link>}>
              {data.stockAlerts.length === 0 ? (
                <Empty>All stock levels are healthy.</Empty>
              ) : (
                <ul className="divide-y divide-paper-200 text-sm">
                  {data.stockAlerts.map((a) => (
                    <li key={`${a.productId}:${a.variantId ?? ''}`} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="font-medium text-navy-800">{a.productName}</span>
                        {a.variantLabel && <span className="block truncate text-xs text-muted">{a.variantLabel}</span>}
                      </span>
                      <StockPill stock={a.stock} threshold={a.threshold} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Top sellers (last 30 days)">
              {data.topSellers.length === 0 ? (
                <Empty>No sales in the last 30 days.</Empty>
              ) : (
                <ol className="divide-y divide-paper-200 text-sm">
                  {data.topSellers.map((t, i) => (
                    <li key={t.name} className="flex justify-between gap-3 py-2">
                      <span>
                        {i + 1}. {t.name}
                      </span>
                      <span className="text-muted">
                        {t.quantity} sold · {formatKES(t.revenue)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card title="Custom requests to answer" actions={<Link to="/admin/custom-requests" className="text-xs underline">Pipeline</Link>}>
              {data.latestCustomRequests.length === 0 ? (
                <Empty>No open requests.</Empty>
              ) : (
                <ul className="divide-y divide-paper-200 text-sm">
                  {data.latestCustomRequests.map((r) => (
                    <li key={r.id} className="py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-navy-800">{r.customerName}</span>
                        <StatusBadge value={r.status} />
                      </div>
                      <p className="truncate text-muted">{r.description}</p>
                      <p className="text-xs text-muted">{formatLongDate(r.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
