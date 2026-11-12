const numberFmt = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });

export function formatKES(amount: number): string {
  return `KES ${numberFmt.format(Math.round(amount))}`;
}

const dayFmt = new Intl.DateTimeFormat('en-KE', { weekday: 'short', day: 'numeric', month: 'short' });
const longFmt = new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });

/** Parses 'YYYY-MM-DD' as a local date (no timezone shift). */
export function parseISODate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function formatDay(value: string | Date): string {
  return dayFmt.format(typeof value === 'string' ? parseISODate(value) : value);
}

export function formatLongDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return longFmt.format(date);
}

export function formatDayRange(from: string | Date, to: string | Date): string {
  const a = formatDay(from);
  const b = formatDay(to);
  return a === b ? a : `${a} to ${b}`;
}

export function pluralise(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
