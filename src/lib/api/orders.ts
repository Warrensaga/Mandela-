import { supabase } from '../supabase';
import type { Json } from '../database.types';
import { normalizeKePhone } from '../phone';
import { ApiError, toApiError } from './errors';
import type {
  CheckoutCustomer,
  CheckoutItem,
  OrderStatus,
  OrderTracking,
  PaymentStatus,
  PlacedOrder,
  PlacedOrderLine,
} from './types';

type Obj = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);
const strOrNull = (v: unknown) => (typeof v === 'string' && v ? v : null);

/**
 * Places an order. Prices, delivery fee and stock are all decided by the
 * database (create_order); only ids and quantities are sent.
 */
export async function createOrder(input: {
  customer: CheckoutCustomer;
  zoneId: string;
  items: CheckoutItem[];
  preferredDeliveryDate?: string;
  notes?: string;
}): Promise<PlacedOrder> {
  const { data, error } = await supabase.rpc('create_order', {
    p_customer: {
      full_name: input.customer.fullName,
      phone: input.customer.phone,
      email: input.customer.email || null,
      address: input.customer.address,
      city: input.customer.city,
    },
    p_zone_id: input.zoneId,
    p_items: input.items.map((i) => ({
      product_id: i.productId,
      variant_id: i.variantId,
      quantity: i.quantity,
    })) as Json,
    p_details: {
      preferred_delivery_date: input.preferredDeliveryDate || null,
      notes: input.notes || null,
    },
  });
  if (error) throw toApiError(error);

  const r = (data ?? {}) as Obj;
  const customer = (r.customer ?? {}) as Obj;
  const items = Array.isArray(r.items) ? (r.items as Obj[]) : [];
  return {
    orderNumber: String(r.order_number),
    customer: { fullName: String(customer.full_name ?? ''), phone: String(customer.phone ?? '') },
    deliveryZone: String(r.delivery_zone ?? ''),
    deliveryZoneNotes: strOrNull(r.delivery_zone_notes),
    deliveryAddress: String(r.delivery_address ?? ''),
    deliveryCity: String(r.delivery_city ?? ''),
    preferredDeliveryDate: strOrNull(r.preferred_delivery_date),
    estimatedDeliveryFrom: String(r.estimated_delivery_from ?? ''),
    estimatedDeliveryTo: String(r.estimated_delivery_to ?? ''),
    items: items.map(
      (i): PlacedOrderLine => ({
        productId: String(i.product_id),
        variantId: strOrNull(i.variant_id),
        name: String(i.name),
        variantLabel: strOrNull(i.variant_label),
        sku: strOrNull(i.sku),
        unitPrice: num(i.unit_price),
        quantity: num(i.quantity),
        lineTotal: num(i.line_total),
        madeToOrder: i.made_to_order === true,
      }),
    ),
    subtotal: num(r.subtotal),
    deliveryFee: num(r.delivery_fee),
    total: num(r.total),
    depositAmount: num(r.deposit_amount),
    balanceDue: num(r.balance_due),
    notes: strOrNull(r.notes),
  };
}

/** Tracking lookup. Returns null when the order number and phone do not match. */
export async function getOrderStatus(orderNumber: string, phone: string): Promise<OrderTracking | null> {
  const normalized = normalizeKePhone(phone);
  if (!normalized) throw new ApiError('INVALID_PHONE', 'Please enter the phone number you ordered with.');

  const { data, error } = await supabase.rpc('get_order_status', {
    p_order_number: orderNumber.trim().toUpperCase(),
    p_phone: normalized,
  });
  if (error) throw toApiError(error);
  if (!data) return null;

  const r = data as Obj;
  const items = Array.isArray(r.items) ? (r.items as Obj[]) : [];
  return {
    orderNumber: String(r.order_number),
    status: r.status as OrderStatus,
    paymentStatus: r.payment_status as PaymentStatus,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    deliveryZone: strOrNull(r.delivery_zone),
    preferredDeliveryDate: strOrNull(r.preferred_delivery_date),
    estimatedDeliveryFrom: strOrNull(r.estimated_delivery_from),
    estimatedDeliveryTo: strOrNull(r.estimated_delivery_to),
    total: num(r.total),
    balanceDue: num(r.balance_due),
    items: items.map((i) => ({
      name: String(i.name),
      variantLabel: strOrNull(i.variant_label),
      quantity: num(i.quantity),
    })),
  };
}

const LAST_ORDER_KEY = 'mh-last-order';

/** The confirmation page reads the placed order from this tab's session. */
export function rememberPlacedOrder(order: PlacedOrder): void {
  try {
    sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  } catch {
    /* storage unavailable: the page falls back to tracking */
  }
}

export function recallPlacedOrder(orderNumber: string): PlacedOrder | null {
  try {
    const raw = sessionStorage.getItem(LAST_ORDER_KEY);
    if (!raw) return null;
    const order = JSON.parse(raw) as PlacedOrder;
    return order.orderNumber === orderNumber ? order : null;
  } catch {
    return null;
  }
}
