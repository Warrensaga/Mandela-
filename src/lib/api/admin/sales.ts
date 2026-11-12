import type {
  AdminCustomerStatsRow,
  CustomRequestRow,
  CustomerRow,
  DeliveryZoneRow,
  OrderItemRow,
  OrderRow,
  OrderStatus,
  PaymentStatus,
} from '../../database.types';
import { supabase } from '../../supabase';
import { ApiError, toApiError } from '../errors';

function check<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw toApiError(res.error);
  return res.data as NonNullable<T>;
}

/** Escapes text for a PostgREST `or=(...ilike...)` filter. */
function ilikeTerm(q: string): string {
  return `%${q.replace(/[%_,()*\\]/g, ' ').trim()}%`;
}

// ---------------------------------------------------------------- orders

export type OrderListRow = OrderRow & { customer: Pick<CustomerRow, 'full_name' | 'phone'> | null; zone_name: string | null };

export interface OrderFilters {
  status?: OrderStatus | '';
  payment?: PaymentStatus | '';
  from?: string; // YYYY-MM-DD
  to?: string;
  search?: string; // order number, name or phone
  page?: number;
  pageSize?: number;
}

export async function listOrders(f: OrderFilters): Promise<{ rows: OrderListRow[]; total: number }> {
  const pageSize = f.pageSize ?? 25;
  const page = f.page ?? 0;

  let customerIds: string[] | null = null;
  const search = f.search?.trim();
  if (search && !/^MH-/i.test(search)) {
    const digits = search.replace(/\D/g, '');
    const term = ilikeTerm(search);
    const ors = [`full_name.ilike.${term}`];
    if (digits.length >= 4) ors.push(`phone.ilike.%${digits.slice(-9)}%`);
    const found = check(await supabase.from('customers').select('id').or(ors.join(',')).limit(200));
    customerIds = found.map((c) => c.id);
    if (!customerIds.length) return { rows: [], total: 0 };
  }

  let q = supabase.from('orders').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (f.status) q = q.eq('status', f.status);
  if (f.payment) q = q.eq('payment_status', f.payment);
  if (f.from) q = q.gte('created_at', `${f.from}T00:00:00+03:00`);
  if (f.to) q = q.lte('created_at', `${f.to}T23:59:59+03:00`);
  if (search && /^MH-/i.test(search)) q = q.ilike('order_number', `${search.toUpperCase()}%`);
  if (customerIds) q = q.in('customer_id', customerIds);
  const res = await q.range(page * pageSize, page * pageSize + pageSize - 1);
  if (res.error) throw toApiError(res.error);

  const orders = (res.data ?? []) as OrderRow[];
  const [customers, zones] = await Promise.all([
    orders.length
      ? supabase.from('customers').select('id, full_name, phone').in('id', [...new Set(orders.map((o) => o.customer_id))])
      : Promise.resolve({ data: [], error: null }),
    supabase.from('delivery_zones').select('id, name'),
  ]);
  const cMap = new Map(check(customers).map((c) => [c.id, c]));
  const zMap = new Map(check(zones).map((z) => [z.id, z.name]));
  return {
    rows: orders.map((o) => ({
      ...o,
      customer: cMap.get(o.customer_id) ?? null,
      zone_name: o.delivery_zone_id ? (zMap.get(o.delivery_zone_id) ?? null) : null,
    })),
    total: res.count ?? orders.length,
  };
}

export interface OrderDetail {
  order: OrderRow;
  items: OrderItemRow[];
  customer: CustomerRow | null;
  zone: DeliveryZoneRow | null;
}

export async function getOrder(id: string): Promise<OrderDetail> {
  const order = check(await supabase.from('orders').select('*').eq('id', id).maybeSingle());
  if (!order) throw new ApiError('NOT_FOUND', 'Order not found.');
  const [items, customer, zone] = await Promise.all([
    supabase.from('order_items').select('*').eq('order_id', id),
    supabase.from('customers').select('*').eq('id', order.customer_id).maybeSingle(),
    order.delivery_zone_id
      ? supabase.from('delivery_zones').select('*').eq('id', order.delivery_zone_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  return { order, items: check(items), customer: check(customer), zone: check(zone) };
}

export type OrderPatch = Partial<Pick<OrderRow, 'status' | 'payment_status' | 'payment_method' | 'deposit_amount' | 'balance_due' | 'internal_notes' | 'preferred_delivery_date'>>;

/** Status changes go through here; cancelling restores stock in the database trigger. */
export async function updateOrder(id: string, patch: OrderPatch): Promise<void> {
  check(await supabase.from('orders').update(patch).eq('id', id));
}

/**
 * Owner only. Permanently deletes an order and its items. Stock held by an order
 * that is not cancelled or delivered is restored (and logged) first.
 * Returns the deleted order number.
 */
export async function deleteOrder(id: string): Promise<string> {
  return check(await supabase.rpc('admin_delete_order', { p_order_id: id }));
}

// ---------------------------------------------------------------- customers

export async function listCustomers(search: string): Promise<AdminCustomerStatsRow[]> {
  let q = supabase.from('admin_customer_stats').select('*').order('created_at', { ascending: false }).limit(500);
  const s = search.trim();
  if (s) {
    const digits = s.replace(/\D/g, '');
    const ors = [`full_name.ilike.${ilikeTerm(s)}`, `email.ilike.${ilikeTerm(s)}`, `city.ilike.${ilikeTerm(s)}`];
    if (digits.length >= 4) ors.push(`phone.ilike.%${digits.slice(-9)}%`);
    q = q.or(ors.join(','));
  }
  return check(await q);
}

export async function getCustomer(id: string): Promise<{ customer: AdminCustomerStatsRow; orders: OrderRow[] }> {
  const [c, o] = await Promise.all([
    supabase.from('admin_customer_stats').select('*').eq('id', id).maybeSingle(),
    supabase.from('orders').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
  ]);
  const customer = check(c);
  if (!customer) throw new ApiError('NOT_FOUND', 'Customer not found.');
  return { customer, orders: check(o) };
}

export async function updateCustomer(id: string, patch: Partial<Pick<CustomerRow, 'full_name' | 'email' | 'address' | 'city' | 'notes'>>): Promise<void> {
  check(await supabase.from('customers').update(patch).eq('id', id));
}

// ---------------------------------------------------------------- custom requests

export async function listCustomRequests(): Promise<CustomRequestRow[]> {
  return check(await supabase.from('custom_requests').select('*').order('created_at', { ascending: false }).limit(500));
}

export async function updateCustomRequest(
  id: string,
  patch: Partial<Pick<CustomRequestRow, 'status' | 'quoted_price' | 'deposit_amount' | 'admin_notes'>>,
): Promise<void> {
  check(await supabase.from('custom_requests').update(patch).eq('id', id));
}

/** Short-lived link to the private reference image. */
export async function referenceImageUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('custom-requests').createSignedUrl(path, 600);
  if (error) return null;
  return data.signedUrl;
}

export async function convertCustomRequest(input: {
  requestId: string;
  zoneId: string;
  title: string;
  address: string;
  city: string;
}): Promise<{ orderId: string; orderNumber: string }> {
  const { data, error } = await supabase.rpc('admin_convert_custom_request', {
    p_request_id: input.requestId,
    p_zone_id: input.zoneId,
    p_title: input.title,
    p_address: input.address,
    p_city: input.city,
  });
  if (error) throw toApiError(error);
  const r = (data ?? {}) as Record<string, unknown>;
  return { orderId: String(r.order_id), orderNumber: String(r.order_number) };
}

export async function orderForRequest(requestId: string): Promise<Pick<OrderRow, 'id' | 'order_number' | 'status'> | null> {
  return check(
    await supabase
      .from('orders')
      .select('id, order_number, status')
      .eq('custom_request_id', requestId)
      .neq('status', 'cancelled')
      .maybeSingle(),
  );
}
