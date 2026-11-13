import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { PageBand } from '../components/layout/PageBand';
import { ButtonAnchor, ButtonLink } from '../components/ui/Button';
import { WhatsAppIcon } from '../components/ui/Icon';
import { Reveal, RevealStack } from '../components/ui/Reveal';
import { nodeText, Seo } from '../components/ui/Seo';
import { faqLd } from '../lib/seo';
import { PAGE_KEYWORDS } from '../lib/seoKeywords';
import type { DeliveryZone, SiteSettings } from '../lib/api';
import { formatKES } from '../lib/format';
import { whatsappLink } from '../lib/whatsapp';
import { useSite } from '../state/site';

// Every statement on these pages comes from the live data (zones, settings) or
// describes how the site actually works. No invented policies.

function days(z: DeliveryZone): string {
  return z.daysMin === z.daysMax ? `${z.daysMin} day${z.daysMin === 1 ? '' : 's'}` : `${z.daysMin} to ${z.daysMax} days`;
}

function HelpCta() {
  const { settings } = useSite();
  return (
    <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border border-paper-200 bg-paper-100 p-6">
      <p className="text-navy-800">Still have a question? We usually reply fastest on WhatsApp.</p>
      <div className="flex flex-wrap gap-3">
        {settings.whatsappNumber && (
          <ButtonAnchor variant="whatsapp" size="md" href={whatsappLink(settings.whatsappNumber, `Hello ${settings.storeName}, I have a question.`)} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon className="h-4 w-4" /> Chat on WhatsApp
          </ButtonAnchor>
        )}
        <ButtonLink to="/contact" variant="outline" size="md">Contact us</ButtonLink>
      </div>
    </div>
  );
}

function Shell({
  title,
  description,
  crumb,
  jsonLd,
  seo,
  children,
}: {
  title: string;
  description: string;
  crumb: string;
  jsonLd?: object;
  /** Search title/description when they differ from the visible heading. */
  seo?: { title: string; description: string };
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  return (
    <>
      <Seo
        title={seo?.title ?? title}
        description={seo?.description ?? description}
        jsonLd={jsonLd}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: crumb, path: pathname },
        ]}
      />
      <PageBand title={title} description={description} crumbs={[{ to: '/', label: 'Home' }, { label: crumb }]} />
      <div className="container-page max-w-4xl py-12 sm:py-16">
        <RevealStack>{children}</RevealStack>
        <Reveal>
          <HelpCta />
        </Reveal>
      </div>
    </>
  );
}

export function DeliveryPage() {
  const { zones, settings } = useSite();
  const free = zones.filter((z) => z.freeThreshold !== null);
  return (
    <Shell title="Delivery" crumb="Delivery" seo={PAGE_KEYWORDS.delivery} description="Where we deliver, what it costs and how long it takes. Delivery is within Kenya only.">
      <h2 className="text-3xl">Delivery areas and fees</h2>
      <p className="mt-3 text-muted">Choose your area at checkout and the fee is added to your order. Estimates are for pieces in stock.</p>
      <div className="mt-6 overflow-x-auto border border-paper-200">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-paper-100 text-left">
            <tr>
              <th scope="col" className="label-mono px-4 py-3 text-navy-800">Area</th>
              <th scope="col" className="label-mono px-4 py-3 text-navy-800">Fee</th>
              <th scope="col" className="label-mono px-4 py-3 text-navy-800">Delivery time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-200">
            {zones.map((z) => (
              <tr key={z.id} className="align-top">
                <th scope="row" className="px-4 py-3 text-left font-medium text-navy-800">
                  {z.name}
                  {z.notes && <span className="mt-1 block text-xs font-normal text-muted">{z.notes}</span>}
                </th>
                <td className="px-4 py-3 whitespace-nowrap">
                  {z.fee === 0 ? 'Free' : formatKES(z.fee)}
                  {z.freeThreshold !== null && <span className="block text-xs text-muted">Free over {formatKES(z.freeThreshold)}</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{days(z)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {free.length > 0 && (
        <p className="mt-4 text-sm text-muted">
          Some pieces are marked <strong className="text-navy-800">Free delivery</strong> on the product page. When every item in your order has free delivery, the delivery fee is waived.
        </p>
      )}

      <h2 className="mt-12 text-3xl">Made-to-order and custom pieces</h2>
      <p className="mt-3 text-muted">
        Pieces marked <em>Made to order</em> are built in our workshop after you order. Their workshop time is shown on the product page and added to the
        delivery estimate. Made-to-order and custom pieces start with a {settings.depositPercent}% deposit.
      </p>

      <h2 className="mt-12 text-3xl">How delivery works</h2>
      <ol className="mt-4 space-y-3 text-muted">
        <li><strong className="text-navy-800">1. You order online.</strong> Your order and the expected delivery dates appear on the confirmation page.</li>
        <li><strong className="text-navy-800">2. We confirm on WhatsApp.</strong> We confirm availability, total and the delivery date with you before payment.</li>
        <li><strong className="text-navy-800">3. We deliver.</strong> You can follow progress any time on <Link to="/track-order" className="text-brand-600 underline">Track your order</Link>.</li>
      </ol>
    </Shell>
  );
}

function PaymentMethods({ payment }: { payment: SiteSettings['payment'] }) {
  const { paybill, till, bank } = payment;
  const methods: { title: string; body: ReactNode }[] = [];
  if (paybill.businessNumber) {
    methods.push({ title: 'M-Pesa Paybill', body: <>Business number <strong className="text-navy-800">{paybill.businessNumber}</strong>, account: {paybill.accountNumber || 'your order number'}.</> });
  }
  if (till) methods.push({ title: 'M-Pesa Buy Goods (Till)', body: <>Till number <strong className="text-navy-800">{till}</strong>.</> });
  if (bank.accountNumber) {
    methods.push({
      title: 'Bank transfer',
      body: <>{[bank.bankName, bank.branch].filter(Boolean).join(', ')}{bank.accountName && <> · {bank.accountName}</>} · Account <strong className="text-navy-800">{bank.accountNumber}</strong></>,
    });
  }
  if (!methods.length) {
    return <p className="mt-4 border border-paper-200 bg-paper-100 p-4 text-sm text-navy-800">We send payment details (M-Pesa or bank) with your WhatsApp order confirmation.</p>;
  }
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {methods.map((m) => (
        <li key={m.title} className="border border-paper-200 p-4">
          <p className="label-mono text-navy-800">{m.title}</p>
          <p className="mt-2 text-sm text-muted">{m.body}</p>
        </li>
      ))}
    </ul>
  );
}

export function PaymentPage() {
  const { settings } = useSite();
  return (
    <Shell title="Payment options" crumb="Payment" seo={PAGE_KEYWORDS.payment} description="No payment is taken on this website. We confirm your order first, then you pay by M-Pesa or bank transfer.">
      <h2 className="text-3xl">How paying works</h2>
      <ol className="mt-4 space-y-3 text-muted">
        <li><strong className="text-navy-800">1. Place your order online.</strong> Nothing is charged.</li>
        <li><strong className="text-navy-800">2. We confirm on WhatsApp</strong> the items, total and delivery date.</li>
        <li><strong className="text-navy-800">3. Pay using your order number as the reference</strong>, by one of the methods below.</li>
      </ol>

      <h2 className="mt-10 text-3xl">Ways to pay</h2>
      <PaymentMethods payment={settings.payment} />
      {settings.payment.notes && <p className="mt-4 text-sm text-muted">{settings.payment.notes}</p>}

      <h2 className="mt-10 text-3xl">Deposits</h2>
      <p className="mt-3 text-muted">
        Made-to-order and custom pieces start with a {settings.depositPercent}% deposit. The balance is paid before delivery. Your order confirmation shows
        both amounts.
      </p>
    </Shell>
  );
}

export function FaqPage() {
  const { settings, zones } = useSite();
  const cheapest = zones.length ? Math.min(...zones.map((z) => z.fee)) : null;
  const faqs: { q: string; a: ReactNode }[] = [
    {
      q: 'How do I order?',
      a: <>Add pieces to your cart and check out with your name, phone, address and delivery area. We then confirm your order on WhatsApp. You can also order straight from any product page with <em>Order via WhatsApp</em>.</>,
    },
    {
      q: 'Do I pay online?',
      a: <>No. We confirm your order first, then you pay by M-Pesa or bank transfer using your order number. See <Link to="/payment" className="text-brand-600 underline">Payment options</Link>.</>,
    },
    {
      q: 'Where do you deliver and how much does it cost?',
      a: <>We deliver within Kenya{cheapest !== null && <>, from {cheapest === 0 ? 'free' : formatKES(cheapest)} depending on your area</>}. Fees and times for every area are on the <Link to="/delivery" className="text-brand-600 underline">Delivery</Link> page.</>,
    },
    {
      q: 'Can you make a piece in a different size, fabric or finish?',
      a: <>Yes. Send a <Link to="/custom-request" className="text-brand-600 underline">custom request</Link> with the details and a photo if you have one, and we will reply with a quote. Custom pieces start with a {settings.depositPercent}% deposit.</>,
    },
    {
      q: 'What does "Made to order" mean?',
      a: <>The piece is built in our workshop after you order. The workshop time is shown on the product page and included in the delivery estimate.</>,
    },
    {
      q: 'How do I track my order?',
      a: <>Use <Link to="/track-order" className="text-brand-600 underline">Track your order</Link> with your order number (it starts with MH-) and the phone number you ordered with.</>,
    },
    {
      q: 'Can I see the furniture before I buy?',
      a: <>Yes. Visit our showroom: the address, opening hours and a map are on the <Link to="/contact" className="text-brand-600 underline">Contact</Link> page.</>,
    },
    {
      q: 'I need to change my order. What do I do?',
      a: <>Message us on WhatsApp with your order number as soon as possible and we will help.</>,
    },
  ];
  return (
    <Shell
      title="Frequently asked questions"
      crumb="FAQs"
      description="Ordering, paying, delivery and custom pieces."
      jsonLd={faqLd(faqs.map((f) => ({ q: f.q, a: nodeText(f.a) })))}
    >
      <div className="divide-y divide-paper-200 border-y border-paper-200">
        {faqs.map((f, i) => (
          <Reveal key={f.q} delay={Math.min(i, 4) * 0.04}>
          <details className="group" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-medium text-navy-800 [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="text-2xl text-gold-ink transition-transform group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <div className="pb-5 leading-relaxed text-muted">{f.a}</div>
          </details>
          </Reveal>
        ))}
      </div>
    </Shell>
  );
}
