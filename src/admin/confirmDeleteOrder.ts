import type { OrderStatus } from '../lib/database.types';

/** Asks the owner to confirm a permanent order delete, explaining what happens to stock. */
export function confirmDeleteOrder(order: { order_number: string; status: OrderStatus }): boolean {
  const stock =
    order.status === 'cancelled'
      ? 'Its stock was already returned when it was cancelled.'
      : order.status === 'delivered'
        ? 'It was delivered, so stock is not changed.'
        : 'Its items go back into stock.';
  return window.confirm(
    `Permanently delete order ${order.order_number}?\n\n${stock} The order, its items and its payment record are removed and cannot be recovered. The customer stays.\n\nTo keep a record instead, set the status to Cancelled.`,
  );
}
