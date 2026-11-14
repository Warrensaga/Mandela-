import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAsync } from '../../hooks/useAsync';
import type { CustomRequestRow, CustomRequestStatus } from '../../lib/database.types';
import {
  ApiError,
  convertCustomRequest,
  listCustomRequests,
  listZones,
  orderForRequest,
  referenceImageUrl,
  updateCustomRequest,
} from '../../lib/api/admin';
import { label, REQUEST_STATUSES } from '../../lib/admin/labels';
import { formatKES, formatLongDate } from '../../lib/format';
import { formatKePhone } from '../../lib/phone';
import { whatsappLink } from '../../lib/whatsapp';
import { useSite } from '../../state/site';
import { Btn, Empty, inputCls, LabeledField, Loading, Modal, Notice, PageHeader, StatusBadge } from '../components/ui';

const COLUMNS: CustomRequestStatus[] = ['new', 'quoted', 'accepted', 'in_production', 'ready'];

function RequestCard({ r, onOpen }: { r: CustomRequestRow; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="w-full rounded-lg border border-paper-200 bg-white p-3 text-left text-sm shadow-sm hover:border-navy-200">
      <p className="font-medium text-navy-800">{r.customer_name}</p>
      <p className="mt-0.5 line-clamp-2 text-muted">{r.description}</p>
      <p className="mt-1.5 flex justify-between text-xs text-muted">
        <span>{formatLongDate(r.created_at)}</span>
        {r.quoted_price ? <span className="font-medium text-navy-800">{formatKES(r.quoted_price)}</span> : r.budget ? <span>Budget {formatKES(r.budget)}</span> : null}
      </p>
    </button>
  );
}

function RequestDetail({ r, onSaved }: { r: CustomRequestRow; onSaved: () => void }) {
  const navigate = useNavigate();
  const { settings } = useSite();
  const zones = useAsync(listZones, []);
  const linked = useAsync(() => orderForRequest(r.id), [r.id]);
  const [status, setStatus] = useState(r.status);
  const [quote, setQuote] = useState(r.quoted_price ? String(r.quoted_price) : '');
  const [deposit, setDeposit] = useState(r.deposit_amount ? String(r.deposit_amount) : '');
  const [notes, setNotes] = useState(r.admin_notes ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [convert, setConvert] = useState({ open: false, zoneId: '', title: '', address: '', city: '' });
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (r.reference_image_url) void referenceImageUrl(r.reference_image_url).then(setImageUrl);
  }, [r.reference_image_url]);

  const suggestedDeposit = quote ? Math.round((Number(quote) * settings.depositPercent) / 100) : 0;

  const save = async () => {
    if (quote && !(Number(quote) > 0)) return setMsg({ kind: 'error', text: 'Quote must be above 0.' });
    if (deposit && !(Number(deposit) >= 0)) return setMsg({ kind: 'error', text: 'Deposit must be 0 or more.' });
    setBusy(true);
    try {
      await updateCustomRequest(r.id, {
        status: quote && status === 'new' ? 'quoted' : status,
        quoted_price: quote ? Number(quote) : null,
        deposit_amount: deposit ? Number(deposit) : quote ? suggestedDeposit : null,
        admin_notes: notes.trim() || null,
      });
      setMsg({ kind: 'success', text: 'Saved.' });
      onSaved();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Could not save.' });
    } finally {
      setBusy(false);
    }
  };

  const doConvert = async () => {
    setBusy(true);
    try {
      const res = await convertCustomRequest({ requestId: r.id, zoneId: convert.zoneId, title: convert.title, address: convert.address, city: convert.city });
      onSaved();
      navigate(`/admin/orders/${res.orderId}`);
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Could not convert.' });
      setConvert((c) => ({ ...c, open: false }));
    } finally {
      setBusy(false);
    }
  };

  const quoteMessage = r.quoted_price
    ? `Hello ${r.customer_name.split(' ')[0]}, thank you for your custom request. Our quote is ${formatKES(r.quoted_price)}${r.deposit_amount ? ` with a deposit of ${formatKES(r.deposit_amount)} to start production` : ''}.`
    : `Hello ${r.customer_name.split(' ')[0]}, thank you for your custom furniture request. We are preparing a quote.`;

  return (
    <div className="space-y-4 text-sm">
      {msg && <Notice kind={msg.kind} onDismiss={() => setMsg(null)}>{msg.text}</Notice>}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={r.status} />
        <span className="text-muted">Received {formatLongDate(r.created_at)}</span>
        <a href={whatsappLink(r.phone, quoteMessage)} target="_blank" rel="noopener noreferrer" className="ml-auto rounded-lg bg-[#1f7a4d] px-3 py-1.5 text-white">
          WhatsApp {r.quoted_price ? 'quote' : 'customer'}
        </a>
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        <div><dt className="text-xs text-muted">Phone</dt><dd>{formatKePhone(r.phone)}</dd></div>
        <div><dt className="text-xs text-muted">Email</dt><dd>{r.email ?? '—'}</dd></div>
        <div className="sm:col-span-2"><dt className="text-xs text-muted">Request</dt><dd className="whitespace-pre-line">{r.description}</dd></div>
        <div><dt className="text-xs text-muted">Dimensions</dt><dd>{r.dimensions ?? '—'}</dd></div>
        <div><dt className="text-xs text-muted">Fabric / finish</dt><dd>{r.preferred_material ?? '—'}</dd></div>
        <div><dt className="text-xs text-muted">Budget</dt><dd>{r.budget ? formatKES(r.budget) : '—'}</dd></div>
      </dl>
      {r.reference_image_url && (
        <div>
          <p className="text-xs text-muted">Reference photo (private link, valid 10 minutes)</p>
          {imageUrl ? <a href={imageUrl} target="_blank" rel="noopener noreferrer"><img src={imageUrl} alt="Customer reference" className="mt-1 max-h-56 rounded-lg object-contain" /></a> : <p>Loading…</p>}
        </div>
      )}
      <div className="grid gap-3 border-t border-paper-200 pt-4 sm:grid-cols-2">
        <LabeledField label="Status">
          {(fid) => (
            <select id={fid} className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as CustomRequestStatus)}>
              {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          )}
        </LabeledField>
        <LabeledField label="Quoted price (KES)">
          {(fid) => <input id={fid} inputMode="decimal" className={inputCls} value={quote} onChange={(e) => setQuote(e.target.value)} />}
        </LabeledField>
        <LabeledField label="Deposit (KES)" hint={quote ? `Default ${settings.depositPercent}%: ${formatKES(suggestedDeposit)}` : undefined}>
          {(fid) => <input id={fid} inputMode="decimal" className={inputCls} value={deposit} placeholder={quote ? String(suggestedDeposit) : ''} onChange={(e) => setDeposit(e.target.value)} />}
        </LabeledField>
        <LabeledField label="Internal notes" className="sm:col-span-2">
          {(fid) => <textarea id={fid} rows={3} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />}
        </LabeledField>
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => void save()} disabled={busy}>Save</Btn>
        {linked.data ? (
          <Link to={`/admin/orders/${linked.data.id}`} className="rounded-lg border border-paper-300 px-3.5 py-2 text-navy-800">Order {linked.data.order_number}</Link>
        ) : (
          <Btn variant="secondary" disabled={busy || !r.quoted_price} title={r.quoted_price ? undefined : 'Save a quote first'} onClick={() => setConvert({ open: true, zoneId: '', title: '', address: '', city: '' })}>
            Convert to order
          </Btn>
        )}
      </div>
      {convert.open && (
        <div className="space-y-3 rounded-lg border border-paper-300 bg-paper-50 p-3">
          <p className="font-medium text-navy-800">Create order for {formatKES(r.quoted_price ?? 0)} + delivery</p>
          <LabeledField label="Item title">{(fid) => <input id={fid} className={inputCls} placeholder="e.g. Walnut desk, 140cm" value={convert.title} onChange={(e) => setConvert((c) => ({ ...c, title: e.target.value }))} />}</LabeledField>
          <LabeledField label="Delivery zone">
            {(fid) => (
              <select id={fid} className={inputCls} value={convert.zoneId} onChange={(e) => setConvert((c) => ({ ...c, zoneId: e.target.value }))}>
                <option value="">Choose…</option>
                {/* Only zones customers can choose at checkout. */}
                {(zones.data ?? []).filter((z) => z.is_active).map((z) => <option key={z.id} value={z.id}>{z.name} ({formatKES(z.fee)})</option>)}
              </select>
            )}
          </LabeledField>
          <LabeledField label="Delivery address">{(fid) => <input id={fid} className={inputCls} value={convert.address} onChange={(e) => setConvert((c) => ({ ...c, address: e.target.value }))} />}</LabeledField>
          <LabeledField label="Town">{(fid) => <input id={fid} className={inputCls} value={convert.city} onChange={(e) => setConvert((c) => ({ ...c, city: e.target.value }))} />}</LabeledField>
          <div className="flex gap-2">
            <Btn onClick={() => void doConvert()} disabled={busy || !convert.zoneId || !convert.address.trim() || !convert.city.trim()}>Create order</Btn>
            <Btn variant="ghost" onClick={() => setConvert((c) => ({ ...c, open: false }))}>Cancel</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomRequestsPage() {
  const { data, loading, error, reload } = useAsync(listCustomRequests, []);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const open = data?.find((r) => r.id === openId) ?? null;
  const closed = (data ?? []).filter((r) => r.status === 'delivered' || r.status === 'declined');

  return (
    <>
      <PageHeader title="Custom requests" description="Quote, follow up on WhatsApp, and convert accepted requests into orders." />
      {error && <Notice kind="error">{error.message}</Notice>}
      {loading && !data ? (
        <Loading />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            {COLUMNS.map((col) => {
              const items = (data ?? []).filter((r) => r.status === col);
              return (
                <section key={col} aria-label={label(col)} className="rounded-xl bg-paper-200/60 p-2">
                  <h2 className="mb-2 flex items-center justify-between px-1 font-sans text-sm font-semibold text-navy-800">
                    {label(col)} <span className="text-xs font-normal text-muted">{items.length}</span>
                  </h2>
                  <div className="space-y-2">
                    {items.length === 0 ? <p className="px-1 py-4 text-center text-xs text-muted">None</p> : items.map((r) => <RequestCard key={r.id} r={r} onOpen={() => setOpenId(r.id)} />)}
                  </div>
                </section>
              );
            })}
          </div>
          <div className="mt-6">
            <Btn variant="ghost" onClick={() => setShowClosed((s) => !s)}>{showClosed ? 'Hide' : 'Show'} delivered and declined ({closed.length})</Btn>
            {showClosed && (closed.length ? <div className="mt-2 grid gap-2 md:grid-cols-3">{closed.map((r) => <RequestCard key={r.id} r={r} onOpen={() => setOpenId(r.id)} />)}</div> : <Empty>None.</Empty>)}
          </div>
        </>
      )}
      <Modal open={open !== null} onClose={() => setOpenId(null)} title={open ? `Request from ${open.customer_name}` : ''} wide>
        {open && <RequestDetail key={open.id + open.status + String(open.quoted_price)} r={open} onSaved={reload} />}
      </Modal>
    </>
  );
}
