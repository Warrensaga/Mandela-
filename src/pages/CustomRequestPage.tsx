import { useEffect, useState, type FormEvent } from 'react';
import { Button, ButtonAnchor } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Icon, WhatsAppIcon } from '../components/ui/Icon';
import { Seo } from '../components/ui/Seo';
import { PAGE_KEYWORDS } from '../lib/seoKeywords';
import { ApiError, submitCustomRequest, validateReferenceImage } from '../lib/api';
import { normalizeKePhone } from '../lib/phone';
import { whatsappLink } from '../lib/whatsapp';
import { useSite } from '../state/site';

interface FormState {
  customerName: string;
  phone: string;
  email: string;
  description: string;
  dimensions: string;
  preferredMaterial: string;
  budget: string;
}

const EMPTY: FormState = { customerName: '', phone: '', email: '', description: '', dimensions: '', preferredMaterial: '', budget: '' };

export default function CustomRequestPage() {
  const { settings } = useSite();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'file' | 'form', string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (form.customerName.trim().length < 2) next.customerName = 'Please enter your name.';
    if (!normalizeKePhone(form.phone)) next.phone = 'Enter a Kenyan number, for example 0712 345 678.';
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) next.email = 'That email address does not look right.';
    if (form.description.trim().length < 10) next.description = 'Please describe the piece (at least a sentence).';
    const budget = form.budget ? Number(form.budget.replace(/[^\d.]/g, '')) : undefined;
    if (form.budget && (!Number.isFinite(budget) || (budget ?? 0) < 0)) next.budget = 'Enter your budget in KES, numbers only.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const r = await submitCustomRequest({
        customerName: form.customerName.trim(),
        phone: form.phone,
        email: form.email.trim(),
        description: form.description.trim(),
        dimensions: form.dimensions.trim(),
        preferredMaterial: form.preferredMaterial.trim(),
        budget,
        referenceImage: file,
      });
      setReference(r.reference);
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (reference) {
    const msg = `Hello, I have just sent a custom furniture request (${reference}): ${form.description.trim().slice(0, 300)}`;
    return (
      <div className="container-page max-w-xl py-20 text-center">
        <Seo title="Request received" noindex />
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white">
          <Icon name="check" className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-4xl">Request received</h1>
        <p className="mt-3 text-muted">
          Your reference is <strong className="text-navy-800">{reference}</strong>. Our workshop will review it and reply with a quote on
          WhatsApp. Custom pieces start with a {settings.depositPercent}% deposit once you accept the quote.
        </p>
        {settings.whatsappNumber && (
          <ButtonAnchor variant="whatsapp" size="lg" className="mt-6" href={whatsappLink(settings.whatsappNumber, msg)} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon />
            Follow up on WhatsApp
          </ButtonAnchor>
        )}
      </div>
    );
  }

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <Seo
        title={PAGE_KEYWORDS.custom.title}
        description={PAGE_KEYWORDS.custom.description}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Custom orders', path: '/custom-request' },
        ]}
      />
      <p className="eyebrow">Custom and made to order</p>
      <h1 className="mt-2 text-4xl sm:text-5xl">Request a custom piece</h1>
      <p className="mt-3 text-muted">
        Describe what you need and attach a photo if you have one. We reply with a quote on WhatsApp. Production starts after a{' '}
        {settings.depositPercent}% deposit.
      </p>

      <form onSubmit={submit} noValidate className="card mt-8 grid gap-5 p-5 sm:grid-cols-2 sm:p-8">
        <Field label="Your name" error={errors.customerName}>
          {(p) => <input {...p} className="input" autoComplete="name" value={form.customerName} onChange={(e) => set('customerName', e.target.value)} />}
        </Field>
        <Field label="Phone (WhatsApp)" error={errors.phone}>
          {(p) => <input {...p} className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" value={form.phone} onChange={(e) => set('phone', e.target.value)} />}
        </Field>
        <Field label="Email" optional error={errors.email} className="sm:col-span-2">
          {(p) => <input {...p} className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} />}
        </Field>
        <Field label="What would you like made?" hint="For example: a 6-seater dining table in mvule with a bench." error={errors.description} className="sm:col-span-2">
          {(p) => <textarea {...p} rows={5} className="input" value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={4000} />}
        </Field>
        <Field label="Dimensions" optional hint="Length × width × height, in cm.">
          {(p) => <input {...p} className="input" value={form.dimensions} onChange={(e) => set('dimensions', e.target.value)} />}
        </Field>
        <Field label="Preferred fabric or finish" optional>
          {(p) => <input {...p} className="input" value={form.preferredMaterial} onChange={(e) => set('preferredMaterial', e.target.value)} />}
        </Field>
        <Field label="Budget (KES)" optional error={errors.budget}>
          {(p) => <input {...p} className="input" inputMode="numeric" placeholder="e.g. 80000" value={form.budget} onChange={(e) => set('budget', e.target.value)} />}
        </Field>
        <Field label="Reference photo" optional hint="JPG, PNG, WebP or HEIC, up to 5 MB. Only our team can see it." error={errors.file}>
          {(p) => (
            <input
              {...p}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-navy-800 file:px-4 file:py-2 file:text-sm file:text-paper-50 hover:file:bg-navy-900"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                const problem = f ? validateReferenceImage(f) : null;
                setErrors((er) => ({ ...er, file: problem ?? undefined }));
                setFile(problem ? null : f);
                if (problem) e.target.value = '';
              }}
            />
          )}
        </Field>
        {preview && (
          <div className="flex items-center gap-3 sm:col-span-2">
            <img src={preview} alt="Your reference" className="h-20 w-20 rounded-lg object-cover" />
            <button type="button" className="text-sm text-navy-800 underline underline-offset-4" onClick={() => setFile(null)}>
              Remove photo
            </button>
          </div>
        )}
        {errors.form && <p className="rounded-lg bg-terracotta-500/10 p-3 text-sm text-terracotta-600 sm:col-span-2" role="alert">{errors.form}</p>}
        <div className="sm:col-span-2">
          <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? 'Sending…' : 'Send request'}
          </Button>
        </div>
      </form>
    </div>
  );
}
