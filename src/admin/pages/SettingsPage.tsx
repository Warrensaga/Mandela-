import { useEffect, useState, type FormEvent } from 'react';
import { useAsync } from '../../hooks/useAsync';
import type { Json } from '../../lib/database.types';
import { ApiError, changePassword, listSettings, saveSettings } from '../../lib/api/admin';
import { parseCoords } from '../../lib/api/settings';
import { useAdmin } from '../auth';
import { Btn, Card, inputCls, LabeledField, Loading, Notice, PageHeader, Toggle } from '../components/ui';

interface Form {
  store_name: string;
  whatsapp_number: string;
  deposit_percent: string;
  contact: { phone: string; email: string; address: string; map_url: string; map_coords: string };
  opening_hours: { days: string; hours: string }[];
  payment: {
    paybill: string;
    account: string;
    till: string;
    bank_name: string;
    account_name: string;
    account_number: string;
    branch: string;
    notes: string;
  };
  announcement: { enabled: boolean; text: string; link: string };
  social: { tiktok: string; instagram: string };
}

type Obj = Record<string, unknown>;
const o = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {});
const s = (v: unknown) => (typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v));

function fromRows(rows: { key: string; value: Json }[]): Form {
  const m = new Map(rows.map((r) => [r.key, r.value as unknown]));
  const contact = o(m.get('contact'));
  const pay = o(m.get('payment_instructions'));
  const paybill = o(pay.mpesa_paybill);
  const bank = o(pay.bank);
  const ann = o(m.get('announcement_bar'));
  const social = o(m.get('social'));
  const hours = m.get('opening_hours');
  return {
    store_name: s(m.get('store_name')),
    whatsapp_number: s(m.get('whatsapp_number')),
    deposit_percent: s(m.get('deposit_percent') ?? 50),
    contact: { phone: s(contact.phone), email: s(contact.email), address: s(contact.address), map_url: s(contact.map_url), map_coords: s(contact.map_coords) },
    opening_hours: Array.isArray(hours) ? hours.map((h) => ({ days: s(o(h).days), hours: s(o(h).hours) })) : [],
    payment: {
      paybill: s(paybill.business_number),
      account: s(paybill.account_number),
      till: s(pay.mpesa_till),
      bank_name: s(bank.bank_name),
      account_name: s(bank.account_name),
      account_number: s(bank.account_number),
      branch: s(bank.branch),
      notes: s(pay.notes),
    },
    announcement: { enabled: ann.enabled === true, text: s(ann.text), link: s(ann.link) },
    social: { tiktok: s(social.tiktok), instagram: s(social.instagram) },
  };
}

function validate(f: Form): string[] {
  const e: string[] = [];
  if (!/^2547\d{8}$|^2541\d{8}$/.test(f.whatsapp_number)) e.push('WhatsApp number must look like 2547XXXXXXXX (no plus sign or spaces).');
  const dep = Number(f.deposit_percent);
  if (!(dep >= 0 && dep <= 100)) e.push('Deposit percent must be between 0 and 100.');
  if (f.contact.map_url && !/^https:\/\//.test(f.contact.map_url)) e.push('Map link must start with https://.');
  if (f.contact.map_coords && !parseCoords(f.contact.map_coords)) e.push('Map coordinates must look like -1.2748849,36.9725608 (latitude,longitude).');
  for (const [name, url] of [['TikTok', f.social.tiktok], ['Instagram', f.social.instagram]] as const) {
    if (url.trim() && !/^https:\/\//.test(url.trim())) e.push(`${name} link must start with https://.`);
  }
  if (f.announcement.link && !/^(\/|https:\/\/)/.test(f.announcement.link)) e.push('Announcement link must start with / or https://.');
  return e;
}

function toValues(f: Form): Record<string, Json> {
  return {
    store_name: f.store_name.trim(),
    whatsapp_number: f.whatsapp_number,
    deposit_percent: Number(f.deposit_percent),
    contact: { phone: f.contact.phone.trim(), email: f.contact.email.trim(), address: f.contact.address.trim(), map_url: f.contact.map_url.trim() || null, map_coords: parseCoords(f.contact.map_coords) },
    opening_hours: f.opening_hours.filter((h) => h.days.trim()).map((h) => ({ days: h.days.trim(), hours: h.hours.trim() })),
    payment_instructions: {
      mpesa_paybill: { business_number: f.payment.paybill.trim(), account_number: f.payment.account.trim() },
      mpesa_till: f.payment.till.trim(),
      bank: { bank_name: f.payment.bank_name.trim(), account_name: f.payment.account_name.trim(), account_number: f.payment.account_number.trim(), branch: f.payment.branch.trim() },
      notes: f.payment.notes.trim(),
    },
    announcement_bar: { enabled: f.announcement.enabled, text: f.announcement.text.trim(), link: f.announcement.link.trim() || null },
    social: { tiktok: f.social.tiktok.trim(), instagram: f.social.instagram.trim() },
  };
}

function ChangePassword() {
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await changePassword(pw);
      setMsg({ kind: 'success', text: 'Password changed.' });
      setPw('');
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof Error ? err.message : 'Could not change the password.' });
    }
  };
  return (
    <Card title="Your password">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <label htmlFor="new-pw" className="sr-only">New password</label>
        <input id="new-pw" type="password" autoComplete="new-password" className={`${inputCls} max-w-xs`} placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Btn type="submit" variant="secondary">Change password</Btn>
      </form>
    </Card>
  );
}

export default function SettingsPage() {
  const { isOwner } = useAdmin();
  const rows = useAsync(listSettings, []);
  const [form, setForm] = useState<Form | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (rows.data) setForm(fromRows(rows.data));
  }, [rows.data]);

  if (rows.error) return <Notice kind="error">{rows.error.message}</Notice>;
  if (!form) return <Loading />;

  const up = (patch: Partial<Form>) => setForm({ ...form, ...patch });
  const field = (labelText: string, value: string, onChange: (v: string) => void, opts: { hint?: string; multiline?: boolean; className?: string } = {}) => (
    <LabeledField label={labelText} hint={opts.hint} className={opts.className}>
      {(fid) =>
        opts.multiline ? (
          <textarea id={fid} rows={2} disabled={!isOwner} className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input id={fid} disabled={!isOwner} className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
        )
      }
    </LabeledField>
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (errs.length) return setMsg({ kind: 'error', text: errs.join(' ') });
    setSaving(true);
    try {
      await saveSettings(toValues(form));
      setMsg({ kind: 'success', text: 'Settings saved. The shop shows them on the next page load.' });
      rows.reload();
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof ApiError ? err.message : 'Could not save.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" description={isOwner ? 'Shown on the shop, checkout, confirmation page and invoices.' : 'Only the owner can change settings.'} />
      {msg && <Notice kind={msg.kind} onDismiss={() => setMsg(null)}>{msg.text}</Notice>}
      <form onSubmit={submit} className="space-y-6">
        <Card title="Store and WhatsApp">
          <div className="grid gap-3 md:grid-cols-3">
            {field('Store name', form.store_name, (v) => up({ store_name: v }))}
            {field('WhatsApp number', form.whatsapp_number, (v) => up({ whatsapp_number: v.replace(/\s/g, '') }), { hint: 'Format 2547XXXXXXXX. Orders are sent here.' })}
            {field('Deposit for custom / made-to-order (%)', form.deposit_percent, (v) => up({ deposit_percent: v }))}
          </div>
        </Card>
        <Card title="Payment instructions (manual)">
          <p className="mb-3 text-xs text-muted">Shown after an order is placed. Blank fields are hidden. No online payments are taken.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {field('M-Pesa Paybill business number', form.payment.paybill, (v) => up({ payment: { ...form.payment, paybill: v } }))}
            {field('Paybill account', form.payment.account, (v) => up({ payment: { ...form.payment, account: v } }), { hint: 'e.g. "Your order number"' })}
            {field('M-Pesa Till number', form.payment.till, (v) => up({ payment: { ...form.payment, till: v } }))}
            {field('Bank name', form.payment.bank_name, (v) => up({ payment: { ...form.payment, bank_name: v } }))}
            {field('Account name', form.payment.account_name, (v) => up({ payment: { ...form.payment, account_name: v } }))}
            {field('Account number', form.payment.account_number, (v) => up({ payment: { ...form.payment, account_number: v } }))}
            {field('Branch', form.payment.branch, (v) => up({ payment: { ...form.payment, branch: v } }))}
            {field('Payment notes', form.payment.notes, (v) => up({ payment: { ...form.payment, notes: v } }), { multiline: true })}
          </div>
        </Card>
        <Card title="Contact and showroom">
          <div className="grid gap-3 md:grid-cols-2">
            {field('Phone', form.contact.phone, (v) => up({ contact: { ...form.contact, phone: v } }))}
            {field('Email', form.contact.email, (v) => up({ contact: { ...form.contact, email: v } }))}
            {field('Showroom address', form.contact.address, (v) => up({ contact: { ...form.contact, address: v } }))}
            {field(
              'Map link',
              form.contact.map_url,
              (v) => {
                // A full google.com/maps link carries the pin; fill the coordinates from it.
                const pin = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(v) ?? /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(v);
                up({ contact: { ...form.contact, map_url: v, map_coords: pin ? `${pin[1]},${pin[2]}` : form.contact.map_coords } });
              },
              { hint: 'Your Google Maps share link (https://…). "Open in Google Maps" uses it.' },
            )}
            {field('Map coordinates', form.contact.map_coords, (v) => up({ contact: { ...form.contact, map_coords: v } }), {
              hint: 'Latitude,longitude of the showroom pin, e.g. -1.2748849,36.9725608. In Google Maps, right-click the pin to copy them. Filled in automatically from a full Maps link.',
            })}
          </div>
          <p className="mt-4 mb-2 text-xs font-medium text-navy-800">Opening hours</p>
          <div className="space-y-2">
            {form.opening_hours.map((h, i) => (
              <div key={i} className="flex gap-2">
                <input aria-label="Days" disabled={!isOwner} className={inputCls} value={h.days} onChange={(e) => up({ opening_hours: form.opening_hours.map((x, j) => (j === i ? { ...x, days: e.target.value } : x)) })} />
                <input aria-label="Hours" disabled={!isOwner} className={inputCls} value={h.hours} onChange={(e) => up({ opening_hours: form.opening_hours.map((x, j) => (j === i ? { ...x, hours: e.target.value } : x)) })} />
                <Btn variant="ghost" disabled={!isOwner} onClick={() => up({ opening_hours: form.opening_hours.filter((_, j) => j !== i) })} aria-label="Remove row">✕</Btn>
              </div>
            ))}
            <Btn variant="secondary" disabled={!isOwner} onClick={() => up({ opening_hours: [...form.opening_hours, { days: '', hours: '' }] })}>+ Add row</Btn>
          </div>
        </Card>
        <Card title="Announcement bar">
          <div className="grid gap-3 md:grid-cols-2">
            <Toggle label="Show announcement bar" disabled={!isOwner} checked={form.announcement.enabled} onChange={(v) => up({ announcement: { ...form.announcement, enabled: v } })} />
            <span />
            {field('Text', form.announcement.text, (v) => up({ announcement: { ...form.announcement, text: v } }))}
            {field('Link (optional)', form.announcement.link, (v) => up({ announcement: { ...form.announcement, link: v } }), { hint: 'e.g. /delivery' })}
          </div>
        </Card>
        <Card title="Social media">
          <div className="grid gap-3 md:grid-cols-2">
            {field('TikTok profile link', form.social.tiktok, (v) => up({ social: { ...form.social, tiktok: v } }), { hint: 'Leave empty to hide the icon.' })}
            {field('Instagram profile link', form.social.instagram, (v) => up({ social: { ...form.social, instagram: v } }), { hint: 'Leave empty to hide the icon.' })}
          </div>
        </Card>
        {isOwner && <Btn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Btn>}
      </form>
      <div className="mt-6">
        <ChangePassword />
      </div>
    </>
  );
}
