/**
 * Mirrors public.normalize_ke_phone() in the database so forms can validate
 * before submitting. Returns +2547XXXXXXXX / +2541XXXXXXXX, or null.
 */
export function normalizeKePhone(input: string): string | null {
  const v = input.replace(/[\s\-().]/g, '');
  if (/^\+254[17]\d{8}$/.test(v)) return v;
  if (/^254[17]\d{8}$/.test(v)) return `+${v}`;
  if (/^0[17]\d{8}$/.test(v)) return `+254${v.slice(1)}`;
  if (/^[17]\d{8}$/.test(v)) return `+254${v}`;
  return null;
}

export function formatKePhone(phone: string): string {
  const n = normalizeKePhone(phone);
  if (!n) return phone;
  return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7, 10)} ${n.slice(10)}`;
}
