import type { CustomRequestStatus, OrderStatus, PaymentStatus } from '../../database.types';
import { supabase } from '../../supabase';
import { toApiError } from '../errors';

export interface DashboardData {
  today: { orders: number; revenue: number };
  week: { orders: number; revenue: number };
  month: { orders: number; revenue: number };
  pendingOrders: number;
  unpaidOrders: number;
  lowStockCount: number;
  outOfStockCount: number;
  stockAlerts: { productId: string; variantId: string | null; productName: string; variantLabel: string | null; sku: string | null; stock: number; threshold: number }[];
  recentOrders: { id: string; orderNumber: string; status: OrderStatus; paymentStatus: PaymentStatus; total: number; createdAt: string; customerName: string }[];
  topSellers: { name: string; quantity: number; revenue: number }[];
  newCustomRequests: number;
  latestCustomRequests: { id: string; customerName: string; description: string; status: CustomRequestStatus; createdAt: string }[];
}

type Obj = Record<string, unknown>;
const arr = (v: unknown) => (Array.isArray(v) ? (v as Obj[]) : []);
const period = (v: unknown) => {
  const o = (v ?? {}) as Obj;
  return { orders: Number(o.orders ?? 0), revenue: Number(o.revenue ?? 0) };
};

export async function fetchDashboard(): Promise<DashboardData> {
  const { data, error } = await supabase.rpc('admin_dashboard');
  if (error) throw toApiError(error);
  const d = (data ?? {}) as Obj;
  return {
    today: period(d.today),
    week: period(d.week),
    month: period(d.month),
    pendingOrders: Number(d.pending_orders ?? 0),
    unpaidOrders: Number(d.unpaid_orders ?? 0),
    lowStockCount: Number(d.low_stock_count ?? 0),
    outOfStockCount: Number(d.out_of_stock_count ?? 0),
    stockAlerts: arr(d.stock_alerts).map((a) => ({
      productId: String(a.product_id),
      variantId: a.variant_id ? String(a.variant_id) : null,
      productName: String(a.product_name),
      variantLabel: a.variant_label ? String(a.variant_label) : null,
      sku: a.sku ? String(a.sku) : null,
      stock: Number(a.stock_quantity),
      threshold: Number(a.low_stock_threshold),
    })),
    recentOrders: arr(d.recent_orders).map((o) => ({
      id: String(o.id),
      orderNumber: String(o.order_number),
      status: o.status as OrderStatus,
      paymentStatus: o.payment_status as PaymentStatus,
      total: Number(o.total),
      createdAt: String(o.created_at),
      customerName: String(o.full_name),
    })),
    topSellers: arr(d.top_sellers).map((t) => ({ name: String(t.name), quantity: Number(t.quantity), revenue: Number(t.revenue) })),
    newCustomRequests: Number(d.new_custom_requests ?? 0),
    latestCustomRequests: arr(d.latest_custom_requests).map((r) => ({
      id: String(r.id),
      customerName: String(r.customer_name),
      description: String(r.description),
      status: r.status as CustomRequestStatus,
      createdAt: String(r.created_at),
    })),
  };
}
