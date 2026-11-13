import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { CartLines, cartHasProblems } from '../components/cart/CartLines';
import { Button, ButtonLink } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Reveal } from '../components/ui/Reveal';
import { Seo } from '../components/ui/Seo';
import { ApiError, createOrder, fetchLivePricing, rememberPlacedOrder } from '../lib/api';
import { amountToFreeDelivery, deliveryWindow, estimateTotals, kenyaToday } from '../lib/checkout';
import { formatDayRange, formatKES } from '../lib/format';
import { normalizeKePhone } from '../lib/phone';
import { useCart } from '../state/cart';
import { useSite } from '../state/site';

interface FormState {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zoneId: string;
  preferredDate: string;
  notes: string;
}

type Errors = Partial<Record<keyof FormState | 'form', string>>;

const FORM_KEY = 'mh-checkout-details';

function loadForm(): FormState {
  const empty: FormState = { fullName: '', phone: '', email: '', address: '', city: '', zoneId: '', preferredDate: '', notes: '' };
  try {
    const saved = JSON.parse(localStorage.getItem(FORM_KEY) ?? '{}') as Partial<FormState>;
    // Remember contact details only, never the date or notes.
    return { ...empty, fullName: saved.fullName ?? '', phone: saved.phone ?? '', email: saved.email ?? '', address: saved.address ?? '', city: saved.city ?? '', zoneId: saved.zoneId ?? '' };
  } catch {
    return empty;
  }
}

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (f.fullName.trim().length < 2) e.fullName = 'Please enter your full name.';
  if (!normalizeKePhone(f.phone)) e.phone = 'Enter a Kenyan number, for example 0712 345 678.';
  if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = 'That email address does not look right.';
  if (f.address.trim().length < 3) e.address = 'Please enter your delivery address.';
  if (f.city.trim().length < 2) e.city = 'Please enter your town or city.';
  if (!f.zoneId) e.zoneId = 'Please choose your delivery area.';
  if (f.preferredDate && f.preferredDate < kenyaToday()) e.preferredDate = 'Please choose a date from today onwards.';
  return e;
}

const FIELD_FOR: Record<string, keyof FormState> = {
  full_name: 'fullName',
  phone: 'phone',
  email: 'email',
  address: 'address',
  delivery_zone: 'zoneId',
  preferred_delivery_date: 'preferredDate',
};

export default function CheckoutPage() {
  const cart = useCart();
  const { zones, settings } = useSite();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(loadForm);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [pricesChecked, setPricesChecked] = useState(false);

  // Refresh prices and stock from the database when checkout opens.
  const { reconcile } = cart;
  const lineIds = cart.lines.map((l) => `${l.productId}:${l.variantId ?? ''}`).join(',');
  useEffect(() => {
    if (!lineIds) return;
    let active = true;
    const items = lineIds.split(',').map((k) => {
      const [productId = '', variantId = ''] = k.split(':');
      return { productId, variantId: variantId || null };
    });
    fetchLivePricing(items)
      .then(({ lines }) => {
        if (!active) return;
        setFlagged(new Set(reconcile(lines)));
      })
      .catch(() => undefined)
      .finally(() => active && setPricesChecked(true));
    return () => {
      active = false;
    };
  }, [lineIds, reconcile]);

  const zone = zones.find((z) => z.id === form.zoneId) ?? null;
  const totals = estimateTotals(
    zone,
    { subtotal: cart.subtotal, allFreeDelivery: cart.allFreeDelivery, hasMadeToOrder: cart.hasMadeToOrder, maxLeadTimeDays: cart.maxLeadTimeDays },
    settings.depositPercent,
  );
  const window_ = zone ? deliveryWindow(zone, cart.maxLeadTimeDays) : null;
  const toFree = amountToFreeDelivery(zone, cart.subtotal);
  const blocked = cartHasProblems(cart.lines);
  const minDate = useMemo(() => window_?.from ?? kenyaToday(), [window_?.from]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      document.querySelector<HTMLElement>(`[data-field="${first}"] input, [data-field="${first}"] select, [data-field="${first}"] textarea`)?.focus();
      return;
    }
    if (blocked) {
      setErrors({ form: 'Please fix the items marked in your order first.' });
      return;
    }

    setSubmitting(true);
    try {
      localStorage.setItem(FORM_KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }
    try {
      const order = await createOrder({
        customer: { fullName: form.fullName.trim(), phone: form.phone, email: form.email.trim(), address: form.address.trim(), city: form.city.trim() },
        zoneId: form.zoneId,
        items: cart.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
        preferredDeliveryDate: form.preferredDate || undefined,
        notes: form.notes.trim() || undefined,
      });
      rememberPlacedOrder(order);
      cart.clear();
      navigate(`/order/${order.orderNumber}`, { replace: true });
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      const field = apiErr?.field ? FIELD_FOR[apiErr.field] : undefined;
      setErrors(field ? { [field]: apiErr?.message } : { form: apiErr?.message ?? 'Something went wrong. Please try again.' });
      if (apiErr?.code === 'OUT_OF_STOCK' || apiErr?.code === 'PRODUCT_UNAVAILABLE' || apiErr?.code === 'VARIANT_UNAVAILABLE') {
        // Pull fresh stock so the affected line shows what to change.
        fetchLivePricing(cart.lines.map((l) => ({ productId: l.productId, variantId: l.variantId })))
          .then(({ lines }) => setFlagged(new Set(cart.reconcile(lines))))
          .catch(() => undefined);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.lines.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <Seo title="Checkout" noindex />
        <h1 className="text-4xl">Your cart is empty</h1>
        <ButtonLink to="/shop" className="mt-6">
          Browse the shop
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <Seo title="Checkout" noindex />
      <Reveal>
      <h1 className="text-4xl sm:text-5xl">Checkout</h1>
      <p className="mt-2 text-sm text-muted">
        No payment is taken online. We confirm your order on WhatsApp first.
      </p>
      </Reveal>

      {/* Phones: the summary sits below the form, so show the total up front. */}
      <a
        href="#order-summary"
        className="mt-6 flex items-center justify-between gap-3 border border-paper-300 bg-paper-100 px-4 py-3 lg:hidden"
      >
        <span className="text-sm text-navy-800">
          {cart.count} {cart.count === 1 ? 'item' : 'items'} · {totals.fee === null ? 'Total before delivery' : 'Total'}{' '}
          <strong>{formatKES(totals.total)}</strong>
          {totals.deposit > 0 && <span className="block text-xs text-muted">Deposit to start {formatKES(totals.deposit)}</span>}
        </span>
        <span className="label-mono shrink-0 text-brand-600">View order ↓</span>
      </a>

      <form onSubmit={submit} noValidate className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_400px] [&>*]:min-w-0">
        <div className="space-y-10">
          <Reveal>
          <section aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="text-2xl">Your details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div data-field="fullName" className="sm:col-span-2">
                <Field label="Full name" error={errors.fullName}>
                  {(p) => <input {...p} className="input" autoComplete="name" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />}
                </Field>
              </div>
              <div data-field="phone">
                <Field label="Phone (M-Pesa / WhatsApp)" hint="We confirm your order on this number." error={errors.phone}>
                  {(p) => (
                    <input {...p} className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                  )}
                </Field>
              </div>
              <div data-field="email">
                <Field label="Email" optional error={errors.email}>
                  {(p) => <input {...p} className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} />}
                </Field>
              </div>
            </div>
          </section>
          </Reveal>

          <Reveal>
          <section aria-labelledby="delivery-heading">
            <h2 id="delivery-heading" className="text-2xl">Delivery</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div data-field="address" className="sm:col-span-2">
                <Field label="Delivery address" hint="Estate, street, building and house number, plus a landmark." error={errors.address}>
                  {(p) => (
                    <textarea {...p} rows={2} className="input" autoComplete="street-address" value={form.address} onChange={(e) => set('address', e.target.value)} />
                  )}
                </Field>
              </div>
              <div data-field="city">
                <Field label="Town or city" error={errors.city}>
                  {(p) => <input {...p} className="input" autoComplete="address-level2" value={form.city} onChange={(e) => set('city', e.target.value)} />}
                </Field>
              </div>
              <div data-field="preferredDate">
                <Field label="Preferred delivery date" optional hint={window_ ? `Earliest about ${formatDayRange(window_.from, window_.to)}` : undefined} error={errors.preferredDate}>
                  {(p) => <input {...p} className="input" type="date" min={minDate} value={form.preferredDate} onChange={(e) => set('preferredDate', e.target.value)} />}
                </Field>
              </div>
            </div>

            <fieldset data-field="zoneId" className="mt-6">
              <legend className="mb-2 text-sm font-medium text-navy-800">Delivery area</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {zones.map((z) => {
                  const w = deliveryWindow(z, cart.maxLeadTimeDays);
                  const free = cart.allFreeDelivery || (z.freeThreshold !== null && cart.subtotal >= z.freeThreshold);
                  return (
                    <label
                      key={z.id}
                      className={`flex cursor-pointer flex-col border p-4 transition-colors ${form.zoneId === z.id ? 'border-navy-800 bg-navy-50' : 'border-paper-300 bg-paper-50 hover:border-navy-400'}`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <input type="radio" name="zone" value={z.id} checked={form.zoneId === z.id} onChange={() => set('zoneId', z.id)} className="accent-brand-600" />
                          <span className="font-medium text-navy-800">{z.name}</span>
                        </span>
                        <span className="text-sm font-semibold text-navy-800">{free ? 'Free' : formatKES(z.fee)}</span>
                      </span>
                      <span className="mt-1 pl-6 text-xs text-muted">Arrives {formatDayRange(w.from, w.to)}</span>
                      {z.notes && <span className="mt-1 pl-6 text-xs text-muted">{z.notes}</span>}
                    </label>
                  );
                })}
              </div>
              {errors.zoneId && <p className="mt-2 text-sm text-terracotta-600" role="alert">{errors.zoneId}</p>}
            </fieldset>

            <div className="mt-6" data-field="notes">
              <Field label="Notes for our team" optional hint="Stairs, gate times, or anything else we should know.">
                {(p) => <textarea {...p} rows={3} className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} maxLength={1000} />}
              </Field>
            </div>
          </section>
          </Reveal>
        </div>

        <aside id="order-summary" className="h-fit scroll-mt-40 lg:sticky lg:top-[calc(var(--header-offset,0px)+1.5rem)] lg:transition-[top] lg:duration-300">
          <Reveal delay={0.1} className="card p-5 sm:p-6">
            <h2 className="text-2xl">Your order</h2>
            <CartLines compact flagged={flagged} />
            {!pricesChecked && <p className="text-xs text-muted">Checking current prices…</p>}
            <dl className="mt-4 space-y-2 border-t border-paper-200 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="text-navy-800">{formatKES(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery{zone ? ` (${zone.name})` : ''}</dt>
                <dd className="text-navy-800">{totals.fee === null ? 'Choose an area' : totals.fee === 0 ? 'Free' : formatKES(totals.fee)}</dd>
              </div>
              {toFree !== null && !cart.allFreeDelivery && (
                <p className="text-xs text-brand-600">Add {formatKES(toFree)} more for free delivery to {zone?.name}.</p>
              )}
              <div className="flex justify-between border-t border-paper-200 pt-3 text-base">
                <dt className="font-semibold text-navy-800">Total</dt>
                <dd className="font-semibold text-navy-800">{formatKES(totals.total)}</dd>
              </div>
              {totals.deposit > 0 && (
                <div className="bg-paper-100 p-3 text-xs text-navy-800">
                  Deposit to start made-to-order pieces: <strong>{formatKES(totals.deposit)}</strong> ({settings.depositPercent}%). Balance {formatKES(totals.balance)} before delivery.
                </div>
              )}
            </dl>
            {errors.form && (
              <p className="mt-4 bg-terracotta-500/10 p-3 text-sm text-terracotta-600" role="alert">
                {errors.form}
              </p>
            )}
            <Button type="submit" size="lg" className="mt-5 w-full" disabled={submitting || blocked}>
              {submitting ? 'Placing your order…' : 'Place order'}
            </Button>
            <p className="mt-3 text-center text-xs text-muted">
              Next, you will see payment details and can send your order to us on WhatsApp. Final totals are confirmed by our system.
            </p>
          </Reveal>
          <p className="mt-4 text-center text-sm">
            <Link to="/cart" className="text-navy-800 underline underline-offset-4">Edit cart</Link>
          </p>
        </aside>
      </form>
    </div>
  );
}
