import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { Seo } from '../components/ui/Seo';
import { ApiError, getOrderStatus, type OrderStatus, type OrderTracking } from '../lib/api';
import { formatDay, formatDayRange, formatKES, formatLongDate } from '../lib/format';
import { normalizeKePhone } from '../lib/phone';

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'Order received' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'processing', label: 'Being prepared' },
  { status: 'out_for_delivery', label: 'Out for delivery' },
  { status: 'delivered', label: 'Delivered' },
];

const PAYMENT_LABELS: Record<OrderTracking['paymentStatus'], string> = {
  unpaid: 'Awaiting payment',
  deposit_paid: 'Deposit received',
  paid: 'Paid in full',
  refunded: 'Refunded',
};

function StatusSteps({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') {
    return <p className="bg-ink/5 p-4 text-navy-800">This order was cancelled. Contact us on WhatsApp if this is unexpected.</p>;
  }
  const current = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="grid gap-3 sm:grid-cols-5 sm:gap-2">
      {STEPS.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s.status} className="flex items-center gap-3 sm:flex-col sm:text-center" aria-current={i === current ? 'step' : undefined}>
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 ${done ? 'border-brand-600 bg-brand-600 text-on-brand' : 'border-paper-300 text-muted'}`}
            >
              {done ? <Icon name="check" className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`text-sm ${i === current ? 'font-semibold text-navy-800' : done ? 'text-navy-800' : 'text-muted'}`}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function TrackOrderPage() {
  const [params] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(params.get('order') ?? '');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ order?: string; phone?: string; form?: string }>({});
  const [result, setResult] = useState<OrderTracking | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!/^MH-\d{6,}$/i.test(orderNumber.trim())) next.order = 'Enter your order number, for example MH-000123.';
    if (!normalizeKePhone(phone)) next.phone = 'Enter the phone number you ordered with.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    setNotFound(false);
    setResult(null);
    try {
      const r = await getOrderStatus(orderNumber, phone);
      if (r) setResult(r);
      else setNotFound(true);
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <Seo title="Track your order" description="Check the status of your Mandela Heritage order with your order number and phone." />
      <p className="eyebrow">Order tracking</p>
      <h1 className="mt-2 text-4xl sm:text-5xl">Track your order</h1>
      <p className="mt-3 text-muted">Enter the order number from your confirmation and the phone number you used.</p>

      <form onSubmit={submit} noValidate className="card mt-8 grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6">
        <Field label="Order number" error={errors.order}>
          {(p) => <input {...p} className="input uppercase" placeholder="MH-000123" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} autoComplete="off" />}
        </Field>
        <Field label="Phone" error={errors.phone}>
          {(p) => <input {...p} className="input" type="tel" inputMode="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />}
        </Field>
        <Button type="submit" size="lg" disabled={loading} className={errors.order || errors.phone ? 'sm:mb-7' : ''}>
          {loading ? 'Checking…' : 'Track'}
        </Button>
      </form>

      <div aria-live="polite" className="mt-8">
        {errors.form && <p className="text-terracotta-600">{errors.form}</p>}
        {notFound && (
          <p className="card p-5 text-navy-800">
            We could not find an order with that number and phone. Please check both, or message us on WhatsApp.
          </p>
        )}
        {result && (
          <section className="card space-y-6 p-5 sm:p-6" aria-labelledby="result-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="result-heading" className="text-3xl">{result.orderNumber}</h2>
              <p className="text-sm text-muted">Placed {formatLongDate(result.createdAt)}</p>
            </div>
            <StatusSteps status={result.status} />
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="font-medium text-navy-800">Payment</dt>
                <dd className="text-muted">{PAYMENT_LABELS[result.paymentStatus]}</dd>
              </div>
              <div>
                <dt className="font-medium text-navy-800">Total</dt>
                <dd className="text-muted">
                  {formatKES(result.total)}
                  {result.balanceDue > 0 && result.paymentStatus !== 'paid' && ` (balance ${formatKES(result.balanceDue)})`}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-navy-800">Delivery</dt>
                <dd className="text-muted">
                  {result.preferredDeliveryDate
                    ? `Preferred ${formatDay(result.preferredDeliveryDate)}`
                    : result.estimatedDeliveryFrom && result.estimatedDeliveryTo
                      ? formatDayRange(result.estimatedDeliveryFrom, result.estimatedDeliveryTo)
                      : 'To be confirmed'}
                  {result.deliveryZone && ` · ${result.deliveryZone}`}
                </dd>
              </div>
            </dl>
            <ul className="divide-y divide-paper-200 border-t border-paper-200 text-sm">
              {result.items.map((i, idx) => (
                <li key={idx} className="py-2.5">
                  <span className="text-navy-800">{i.quantity} × {i.name}</span>
                  {i.variantLabel && <span className="text-muted"> · {i.variantLabel}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
