import { Link } from 'react-router';
import { formatKePhone } from '../../lib/phone';
import { whatsappLink } from '../../lib/whatsapp';
import { useSite } from '../../state/site';
import { WhatsAppIcon } from '../ui/Icon';
import { SocialLinks } from './SocialLinks';

const SHOP_LINKS = [
  { to: '/shop', label: 'Shop all' },
  { to: '/shop?sort=newest', label: 'New arrivals' },
  { to: '/shop?offers=1', label: 'Offers' },
  { to: '/categories', label: 'Collections' },
  { to: '/custom-request', label: 'Custom pieces' },
  { to: '/saved', label: 'Saved items' },
];

const HELP_LINKS = [
  { to: '/track-order', label: 'Track your order' },
  { to: '/delivery', label: 'Delivery' },
  { to: '/payment', label: 'Payment options' },
  { to: '/faq', label: 'FAQs' },
  { to: '/contact', label: 'Contact us' },
];

const columnTitle = 'border-b-2 border-navy-800 pb-3 text-sm font-semibold text-navy-800';

function Column({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <p className={columnTitle}>{title}</p>
      <ul className="mt-4 space-y-1 text-[15px]">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="inline-block py-1.5 text-muted transition-colors hover:text-navy-800">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * White footer with a heavy navy top rule: brand and contact, shop, help and
 * showroom columns, then a navy legal bar.
 */
export function Footer() {
  const { settings } = useSite();
  const { contact, openingHours } = settings;
  const phone = contact.phone || (settings.whatsappNumber ? `+${settings.whatsappNumber}` : '');
  return (
    <footer className="relative mt-24 border-t-4 border-navy-800 bg-paper-50">
      <span className="absolute -top-1 left-0 h-1 w-28 bg-gold-500" aria-hidden="true" />
      {/* Columns */}
      <div className="container-page grid grid-cols-2 gap-x-6 gap-y-10 py-14 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr] lg:gap-12">
        <div className="col-span-2 lg:col-span-1">
          <img src="/logo.png" alt={settings.storeName} width={149} height={93} loading="lazy" className="h-16 w-auto" />
          <ul className="mt-6 space-y-1 text-[15px]">
            {phone && (
              <li>
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="inline-block py-1.5 font-semibold text-navy-800 hover:text-brand-600">
                  {formatKePhone(phone)}
                </a>
              </li>
            )}
            {contact.email && (
              <li>
                <a href={`mailto:${contact.email}`} className="inline-block py-1.5 break-all text-muted hover:text-navy-800">
                  {contact.email}
                </a>
              </li>
            )}
          </ul>
          <div className="mt-5 flex items-center gap-2">
            {settings.whatsappNumber && (
              <a
                href={whatsappLink(settings.whatsappNumber, `Hello ${settings.storeName}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="grid h-11 w-11 place-items-center border border-paper-300 text-navy-800 transition-colors hover:border-brand-600 hover:bg-brand-600 hover:text-on-brand"
                aria-label="WhatsApp (opens in a new tab)"
              >
                <WhatsAppIcon className="h-5 w-5" />
              </a>
            )}
            <SocialLinks />
          </div>
        </div>

        <Column title="Shop" links={SHOP_LINKS} />
        <Column title="Help" links={HELP_LINKS} />

        <div className="col-span-2 lg:col-span-1">
          <p className={columnTitle}>Visit our showroom</p>
          <div className="mt-4 text-[15px]">
            <p className="font-medium text-navy-800">Nairobi</p>
            {contact.address && <p className="mt-1 text-muted">{contact.address}</p>}
            {openingHours.length > 0 && (
              <dl className="mt-4 space-y-1">
                {openingHours.map((h) => (
                  <div key={h.days} className="flex justify-between gap-4 border-b border-paper-200 pb-1">
                    <dt className="text-muted">{h.days}</dt>
                    <dd className="text-navy-800">{h.hours}</dd>
                  </div>
                ))}
              </dl>
            )}
            <Link to="/contact#map" className="label-mono tap mt-5 text-brand-600 hover:text-brand-700">
              Get directions ↗
            </Link>
          </div>
        </div>
      </div>

      {/* Legal bar */}
      <div className="theme-dark">
        <div className="container-page flex flex-col gap-2 py-5 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.storeName}. Prices in KES, delivery within Kenya.
          </p>
          <p>
            Pay by M-Pesa or bank transfer once we confirm your order.{' '}
            <Link to="/payment" className="tap text-navy-800 underline underline-offset-4 hover:text-gold-ink">
              Payment options
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
