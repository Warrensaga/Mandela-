import type { PlacedOrder } from './api/types';
import { formatDayRange, formatDay, formatKES } from './format';

export function whatsappLink(number: string, message: string): string {
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function generalMessage(storeName: string): string {
  return `Hello ${storeName}, I would like some help choosing furniture.`;
}

export function productMessage(input: {
  name: string;
  variantLabel?: string | null;
  price?: number | null;
  quantity?: number;
  url: string;
}): string {
  const lines = [
    'Hello, I would like to order:',
    `${input.quantity && input.quantity > 1 ? `${input.quantity} x ` : ''}${input.name}`,
  ];
  if (input.variantLabel) lines.push(`Option: ${input.variantLabel}`);
  if (input.price) lines.push(`Price: ${formatKES(input.price)}`);
  lines.push(input.url, '', 'Is it available, and when can you deliver?');
  return lines.join('\n');
}

/** Contact form message, sent through WhatsApp (no message is stored on our side). */
export function contactMessage(input: { name: string; phone: string; email?: string; subject: string; message: string }): string {
  const lines = [`Hello, this is ${input.name}.`, `Subject: ${input.subject}`, '', input.message.trim(), '', `Phone: ${input.phone}`];
  if (input.email) lines.push(`Email: ${input.email}`);
  return lines.join('\n');
}

/** The written order confirmation sent to WhatsApp after the order is saved. */
export function orderMessage(order: PlacedOrder): string {
  const items = order.items.map(
    (i) => `- ${i.quantity} x ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''}: ${formatKES(i.lineTotal)}`,
  );
  const lines = [
    `Hello, I have just placed order ${order.orderNumber}.`,
    '',
    ...items,
    '',
    `Subtotal: ${formatKES(order.subtotal)}`,
    `Delivery (${order.deliveryZone}): ${order.deliveryFee === 0 ? 'Free' : formatKES(order.deliveryFee)}`,
    `Total: ${formatKES(order.total)}`,
  ];
  if (order.depositAmount > 0) {
    lines.push(`Deposit to start: ${formatKES(order.depositAmount)} (balance ${formatKES(order.balanceDue)})`);
  }
  lines.push(
    '',
    `Deliver to: ${order.deliveryAddress}, ${order.deliveryCity}`,
    `Expected delivery: ${formatDayRange(order.estimatedDeliveryFrom, order.estimatedDeliveryTo)}`,
  );
  if (order.preferredDeliveryDate) lines.push(`Preferred date: ${formatDay(order.preferredDeliveryDate)}`);
  if (order.notes) lines.push(`Notes: ${order.notes}`);
  lines.push(`Name: ${order.customer.fullName}`, '', 'Please confirm my order and how to pay.');
  return lines.join('\n');
}
