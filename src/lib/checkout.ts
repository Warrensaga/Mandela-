import type { DeliveryZone } from './api/types';
import { addDays, toISODate } from './format';

/** Today in Nairobi as YYYY-MM-DD (matches kenya_today() in the database). */
export function kenyaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());
}

export interface CartTotalsInput {
  subtotal: number;
  allFreeDelivery: boolean;
  hasMadeToOrder: boolean;
  maxLeadTimeDays: number;
}

/**
 * Estimated totals for display. This mirrors create_order(); the database is
 * the source of truth and the confirmation page shows its numbers.
 */
export function estimateTotals(zone: DeliveryZone | null, input: CartTotalsInput, depositPercent: number) {
  let fee: number | null = null;
  if (zone) {
    const freeByThreshold = zone.freeThreshold !== null && input.subtotal >= zone.freeThreshold;
    fee = input.allFreeDelivery || freeByThreshold ? 0 : zone.fee;
  }
  const total = input.subtotal + (fee ?? 0);
  const deposit = input.hasMadeToOrder ? Math.round((total * depositPercent) / 100) : 0;
  return { fee, total, deposit, balance: total - deposit };
}

export function deliveryWindow(zone: DeliveryZone, leadTimeDays: number): { from: string; to: string } {
  const today = new Date(`${kenyaToday()}T00:00:00`);
  return {
    from: toISODate(addDays(today, leadTimeDays + zone.daysMin)),
    to: toISODate(addDays(today, leadTimeDays + zone.daysMax)),
  };
}

/** How far a zone's free-delivery threshold is from the current subtotal. */
export function amountToFreeDelivery(zone: DeliveryZone | null, subtotal: number): number | null {
  if (!zone || zone.freeThreshold === null || subtotal >= zone.freeThreshold) return null;
  return zone.freeThreshold - subtotal;
}
