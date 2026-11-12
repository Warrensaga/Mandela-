import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { PageBand } from '../components/layout/PageBand';
import { Button, ButtonAnchor } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Icon, WhatsAppIcon } from '../components/ui/Icon';
import { Seo } from '../components/ui/Seo';
import { mapDirectionsUrl, mapEmbedUrl, mapOpenUrl, showroomLocation } from '../lib/maps';
import { formatKePhone, normalizeKePhone } from '../lib/phone';
import { contactMessage, whatsappLink } from '../lib/whatsapp';
import { SocialLinks } from '../components/layout/SocialLinks';
import { storeLd } from '../lib/seo';
import { useSite } from '../state/site';

const SUBJECTS = ['Order enquiry', 'Custom piece', 'Delivery', 'Payment', 'Showroom visit', 'Other'];

interface Form {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

function Panel({ title, icon, children }: { title: string; icon: 'clock' | 'pin' | 'shield'; children: React.ReactNode }) {
  return (
    <section className="border border-paper-300 bg-paper-50 p-5">
      <h2 className="label-mono flex items-center gap-2 text-muted">
        <Icon name={icon} className="h-4 w-4 text-gold-500" />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function ContactPage() {
  const { settings } = useSite();
  const { hash } = useLocation();
  const [form, setForm] = useState<Form>({ name: '', email: '', phone: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [sent, setSent] = useState(false);

  const phone = settings.contact.phone || (settings.whatsappNumber ? `+${settings.whatsappNumber}` : '');
  const location = showroomLocation(settings.contact.address, settings.contact.mapCoords);

  // Footer "Get directions" links to /contact#map.
  useEffect(() => {
    if (hash !== '#map') return;
    const t = window.setTimeout(() => document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' }), 300);
    return () => window.clearTimeout(t);
  }, [hash]);

  const set = (k: keyof Form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your name.';
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) next.email = 'That email address does not look right.';
    if (!normalizeKePhone(form.phone)) next.phone = 'Enter a Kenyan number, for example 0712 345 678.';
    if (!form.subject) next.subject = 'Choose a subject.';
    if (form.message.trim().length < 5) next.message = 'Please write a short message.';
    setErrors(next);
    if (Object.keys(next).length || !settings.whatsappNumber) return;

    const text = contactMessage({
      name: form.name.trim(),
      phone: normalizeKePhone(form.phone) ?? form.phone,
      email: form.email.trim() || undefined,
      subject: form.subject,
      message: form.message,
    });
    window.open(whatsappLink(settings.whatsappNumber, text), '_blank', 'noopener,noreferrer');
    setSent(true);
  };

  return (
    <>
      <Seo
        title="Contact us"
        description="Call, WhatsApp or visit the Mandela Heritage Furniture showroom in Nairobi. Opening hours, directions and a contact form."
        jsonLd={storeLd(settings)}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ]}
      />
      <PageBand
        tone="light"
        eyebrow="Get in touch"
        title="Contact us"
        crumbs={[{ to: '/', label: 'Home' }, { label: 'Contact' }]}
      />

      <div className="container-page grid grid-cols-1 gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_360px] [&>*]:min-w-0 lg:py-16">
        <form onSubmit={submit} noValidate className="grid content-start gap-5 sm:grid-cols-2">
          <Field label="Full name *" error={errors.name}>
            {(p) => <input {...p} className="input" autoComplete="name" placeholder="Jane Wanjiru" value={form.name} onChange={(e) => set('name', e.target.value)} />}
          </Field>
          <Field label="Email address" optional error={errors.email}>
            {(p) => <input {...p} type="email" className="input" autoComplete="email" placeholder="jane@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />}
          </Field>
          <Field label="Phone number *" error={errors.phone}>
            {(p) => <input {...p} type="tel" inputMode="tel" className="input" autoComplete="tel" placeholder="0712 345 678" value={form.phone} onChange={(e) => set('phone', e.target.value)} />}
          </Field>
          <Field label="Subject *" error={errors.subject}>
            {(p) => (
              <select {...p} className="input" value={form.subject} onChange={(e) => set('subject', e.target.value)}>
                <option value="">Select a subject…</option>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </Field>
          <Field label="Message *" error={errors.message} className="sm:col-span-2">
            {(p) => <textarea {...p} rows={7} className="input" placeholder="Tell us how we can help…" value={form.message} onChange={(e) => set('message', e.target.value)} maxLength={2000} />}
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" size="lg" className="w-full">
              <WhatsAppIcon className="h-4 w-4" /> Send message
            </Button>
            <p className="mt-2 text-xs text-muted">
              Your message opens in WhatsApp, ready to send to our team. {sent && <span className="text-brand-600">If WhatsApp did not open, use the green button on the right.</span>}
            </p>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="border border-paper-300 bg-paper-50 p-5">
            <h2 className="label-mono text-muted">Call or WhatsApp</h2>
            {phone && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <p className="label-mono text-muted">Main line</p>
                  <a href={`tel:${phone.replace(/\s/g, '')}`} className="tap font-label text-base font-bold text-navy-800 hover:text-brand-600">
                    {formatKePhone(phone)}
                  </a>
                </div>
                <div className="flex gap-2">
                  <a href={`tel:${phone.replace(/\s/g, '')}`} className="grid h-9 w-9 place-items-center border border-paper-300 text-navy-800 hover:border-brand-600 hover:text-brand-600" aria-label="Call us">
                    ✆
                  </a>
                  {settings.whatsappNumber && (
                    <a href={whatsappLink(settings.whatsappNumber, `Hello ${settings.storeName}`)} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center border border-paper-300 text-navy-800 hover:border-brand-600 hover:text-brand-600" aria-label="WhatsApp us (opens in a new tab)">
                      <WhatsAppIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            )}
            {settings.contact.email && (
              <p className="mt-3 text-sm">
                <a href={`mailto:${settings.contact.email}`} className="text-muted hover:text-brand-600">{settings.contact.email}</a>
              </p>
            )}
            {settings.whatsappNumber && (
              <ButtonAnchor
                variant="whatsapp"
                size="md"
                className="mt-4 w-full"
                href={whatsappLink(settings.whatsappNumber, `Hello ${settings.storeName}, I have a question.`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className="h-4 w-4" /> Chat on WhatsApp
              </ButtonAnchor>
            )}
            {(settings.social.tiktok || settings.social.instagram) && (
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-paper-200 pt-4">
                <p className="label-mono text-muted">Follow us</p>
                <SocialLinks />
              </div>
            )}
          </section>

          {settings.openingHours.length > 0 && (
            <Panel title="Business hours" icon="clock">
              <ul className="space-y-2 text-sm">
                {settings.openingHours.map((h) => (
                  <li key={h.days} className="flex justify-between gap-4">
                    <span className="text-muted">{h.days}</span>
                    <span className={`font-label text-xs font-bold ${/closed/i.test(h.hours) ? 'text-terracotta-600' : 'text-navy-800'}`}>{h.hours}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Helpful links" icon="shield">
            <ul className="space-y-2">
              {[
                { to: '/track-order', label: 'Track your order' },
                { to: '/custom-request', label: 'Request a custom piece' },
                { to: '/delivery', label: 'Delivery areas and fees' },
                { to: '/payment', label: 'Payment options' },
                { to: '/faq', label: 'FAQs' },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="label-mono tap text-navy-800 hover:text-brand-600">{l.label} →</Link>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>

      <section id="map" aria-labelledby="map-heading" className="scroll-mt-40 border-t border-paper-200">
        <div className="container-page flex flex-wrap items-end justify-between gap-4 py-10">
          <div>
            <p className="eyebrow eyebrow-line">Visit us</p>
            <h2 id="map-heading" className="mt-3 text-4xl sm:text-5xl">Our showroom</h2>
            <p className="mt-3 text-muted">
              {location.exact ? settings.contact.address : 'Nairobi, Kenya. Call or WhatsApp us for the exact location.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonAnchor href={mapDirectionsUrl(location)} target="_blank" rel="noopener noreferrer" size="md">
              <Icon name="pin" className="h-4 w-4" /> Get directions
            </ButtonAnchor>
            <ButtonAnchor href={mapOpenUrl(location, settings.contact.mapUrl)} target="_blank" rel="noopener noreferrer" variant="outline" size="md">
              Open in Google Maps ↗
            </ButtonAnchor>
          </div>
        </div>
        <div className="relative h-[420px] w-full bg-paper-200 sm:h-[480px]">
          <iframe
            title={`Map showing ${settings.storeName}${location.exact ? ` at ${settings.contact.address}` : ' in Nairobi'}`}
            src={mapEmbedUrl(location)}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </section>
    </>
  );
}
