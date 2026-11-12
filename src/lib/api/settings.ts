import { supabase } from '../supabase';
import type { Json } from '../database.types';
import { env } from '../env';
import { isHttpsUrl, safeLink } from '../url';
import { toApiError } from './errors';
import type { DeliveryZone, SiteSettings } from './types';

type Obj = Record<string, Json | undefined>;

function obj(value: Json | undefined): Obj {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Obj) : {};
}
function str(value: Json | undefined, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** "lat,lng" (e.g. "-1.2748849,36.9725608") within valid ranges, or null. */
export function parseCoords(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(value);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? `${lat},${lng}` : null;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  storeName: 'Mandela Heritage Furniture',
  whatsappNumber: env.whatsappNumber,
  depositPercent: 50,
  contact: { phone: '', email: '', address: '', mapUrl: null, mapCoords: null },
  openingHours: [],
  payment: {
    paybill: { businessNumber: '', accountNumber: '' },
    till: '',
    bank: { bankName: '', accountName: '', accountNumber: '', branch: '' },
    notes: '',
  },
  announcement: { enabled: false, text: '', link: null },
  social: { tiktok: '', instagram: '' },
};

/** Public settings, merged over safe defaults. */
export async function fetchSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase.from('settings').select('key, value');
  if (error) throw toApiError(error);
  const map = new Map(data.map((r) => [r.key, r.value]));

  const contact = obj(map.get('contact'));
  const payment = obj(map.get('payment_instructions'));
  const paybill = obj(payment.mpesa_paybill);
  const bank = obj(payment.bank);
  const announcement = obj(map.get('announcement_bar'));
  const social = obj(map.get('social'));
  const httpsUrl = (v: unknown) => (typeof v === 'string' && isHttpsUrl(v.trim()) ? v.trim() : '');
  const hours = map.get('opening_hours');
  const deposit = Number(map.get('deposit_percent'));

  return {
    storeName: str(map.get('store_name'), DEFAULT_SETTINGS.storeName),
    whatsappNumber: str(map.get('whatsapp_number')).replace(/\D/g, '') || env.whatsappNumber,
    depositPercent: Number.isFinite(deposit) ? deposit : 50,
    contact: {
      phone: str(contact.phone),
      email: str(contact.email),
      address: str(contact.address),
      mapUrl: typeof contact.map_url === 'string' ? contact.map_url : null,
      mapCoords: parseCoords(contact.map_coords),
    },
    openingHours: Array.isArray(hours)
      ? hours.map((h) => ({ days: str(obj(h).days), hours: str(obj(h).hours) }))
      : [],
    payment: {
      paybill: { businessNumber: str(paybill.business_number), accountNumber: str(paybill.account_number) },
      till: str(payment.mpesa_till),
      bank: {
        bankName: str(bank.bank_name),
        accountName: str(bank.account_name),
        accountNumber: str(bank.account_number),
        branch: str(bank.branch),
      },
      notes: str(payment.notes),
    },
    announcement: {
      enabled: announcement.enabled === true,
      text: str(announcement.text),
      link: safeLink(announcement.link),
    },
    social: { tiktok: httpsUrl(social.tiktok), instagram: httpsUrl(social.instagram) },
  };
}

export async function fetchDeliveryZones(): Promise<DeliveryZone[]> {
  const { data, error } = await supabase.from('delivery_zones').select('*').order('sort_order');
  if (error) throw toApiError(error);
  return data.map((z) => ({
    id: z.id,
    name: z.name,
    fee: Number(z.fee),
    daysMin: z.estimated_days_min,
    daysMax: z.estimated_days_max,
    freeThreshold: z.free_delivery_threshold === null ? null : Number(z.free_delivery_threshold),
    notes: z.notes,
  }));
}
