import type { CustomRequestStatus, InventoryReason, OrderStatus, PaymentStatus } from '../database.types';

export const ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled'];
export const PAYMENT_STATUSES: PaymentStatus[] = ['unpaid', 'deposit_paid', 'paid', 'refunded'];
export const REQUEST_STATUSES: CustomRequestStatus[] = ['new', 'quoted', 'accepted', 'in_production', 'ready', 'delivered', 'declined'];
export const MANUAL_REASONS: InventoryReason[] = ['restock', 'adjustment', 'return'];

const PRETTY: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  unpaid: 'Unpaid',
  deposit_paid: 'Deposit paid',
  paid: 'Paid',
  refunded: 'Refunded',
  new: 'New',
  quoted: 'Quoted',
  accepted: 'Accepted',
  in_production: 'In production',
  ready: 'Ready',
  declined: 'Declined',
  restock: 'Restock',
  sale: 'Sale',
  adjustment: 'Adjustment',
  return: 'Return',
  cancelled_order: 'Cancelled order',
};

export function label(value: string): string {
  return PRETTY[value] ?? value;
}

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<string, Tone> = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'info',
  out_for_delivery: 'info',
  delivered: 'success',
  cancelled: 'neutral',
  unpaid: 'warning',
  deposit_paid: 'info',
  paid: 'success',
  refunded: 'neutral',
  new: 'warning',
  quoted: 'info',
  accepted: 'info',
  in_production: 'info',
  ready: 'success',
  declined: 'neutral',
};

export function tone(value: string): Tone {
  return TONES[value] ?? 'neutral';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
