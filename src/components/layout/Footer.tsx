import { Link } from 'react-router';
import { formatKePhone } from '../../lib/phone';
import { whatsappLink } from '../../lib/whatsapp';
import { useSite } from '../../state/site';
import { WhatsAppIcon } from '../ui/Icon';
import { SocialLinks } from './SocialLinks';

const SHOP_LINKS = [
  { to: '/shop', label: 'Shop all' },
  { to: '/shop?offers=1', label: 'Offers' },
  { to: '/shop?sort=newest', label: 'New arrivals' },
  { to: '/categories', label: 'Collections' },
  { to: '/custom-request', label: 'Custom pieces' },
];

const HELP_LINKS = [
  { to: '/track-order', label: 'Track order' },
  { to: '/delivery', label: 'Delivery' },
  { to: '/payment', label: 'Payment options' },
  { to: '/faq', label: 'FAQs' },
  { to: '/contact', label: 'Contact us' },
];

function Column({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <p className="label-mono border-b-2 border-navy-800 pb-3 text-navy-800">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-muted transition-colors hover:text-brand-600">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** White footer with a heavy top rule: brand, shop, help and showroom columns. */
export function Footer() {
  const { settings } = useSite();
  const { contact, openingHours } = settings;
  const phone = contact.phone || (settings.whatsappNumber ? `+${settings.whatsappNumber}` : '');
  return (
    <footer className="relative mt-24 border-t-4 border-navy-800 bg-paper-50">
      <span className="absolute -top-1 left-0 h-1 w-28 bg-gold-500" aria-hidden="true" />
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <img src="/logo.png" alt={settings.storeName} width={149} height={93} className="h-16 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            Comfort transcending time. Hardwood furniture made in Nairobi and delivered across Kenya.
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            {phone && (
              <li>
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="label-mono tap text-navy-800 hover:text-brand-600">
                  {formatKePhone(phone)}
                </a>
              </li>
            )}
            {contact.email && (
              <li>
                <a href={`mailto:${contact.email}`} className="text-muted hover:text-brand-600">
                  {contact.email}
                </a>
              </li>
            )}
          </ul>
          <p className="label-mono mt-6 text-navy-800">Follow us</p>
          <div className="mt-3 flex items-center gap-2">
            {settings.whatsappNumber && (
              <a
                href={whatsappLink(settings.whatsappNumber, `Hello ${settings.storeName}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="grid h-11 w-11 place-items-center border border-paper-300 text-navy-800 transition-colors hover:border-brand-600 hover:bg-brand-600 hover:text-white"
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

        <div>
          <p className="label-mono border-b-2 border-navy-800 pb-3 text-navy-800">Visit our showroom</p>
          <div className="mt-4 border-l-2 border-gold-500 pl-4 text-sm">
            <p className="font-medium text-navy-800">Nairobi</p>
            {contact.address && <p className="mt-1 text-muted">{contact.address}</p>}
            {openingHours.length > 0 && (
              <ul className="mt-3 space-y-0.5 text-muted">
                {openingHours.map((h) => (
                  <li key={h.days}>
                    {h.days}: <span className="text-navy-800">{h.hours}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/contact#map" className="label-mono tap mt-3 text-brand-600 hover:text-brand-700">
              Get directions ↗
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-navy-900 text-paper-300">
        <div className="container-page flex flex-col gap-2 py-4 font-label text-[10px] tracking-[0.14em] uppercase sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.storeName}. Prices in KES. Delivery within Kenya.
          </p>
        </div>
      </div>
    </footer>
  );
}
