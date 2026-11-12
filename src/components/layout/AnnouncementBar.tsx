import { Link } from 'react-router';
import { formatKePhone } from '../../lib/phone';
import { useSite } from '../../state/site';
import { InstagramIcon, TikTokIcon } from '../ui/Icon';

/**
 * Brand-blue top strip: social icons on the left, call/WhatsApp number and the
 * announcement from Settings on the right. On phones only the number shows.
 */
export function AnnouncementBar() {
  const { settings } = useSite();
  const a = settings.announcement;
  const phone = settings.contact.phone || (settings.whatsappNumber ? `+${settings.whatsappNumber}` : '');
  const showAnnouncement = a.enabled && Boolean(a.text);
  const social = [
    { href: settings.social.tiktok, label: 'TikTok', Icon: TikTokIcon },
    { href: settings.social.instagram, label: 'Instagram', Icon: InstagramIcon },
  ].filter((s) => s.href);
  if (!phone && !showAnnouncement && !social.length) return null;

  const announcement = showAnnouncement ? (
    a.link ? (
      a.link.startsWith('/') ? (
        <Link to={a.link} className="hover:text-gold-300">{a.text}</Link>
      ) : (
        <a href={a.link} className="hover:text-gold-300" rel="noopener">{a.text}</a>
      )
    ) : (
      <span>{a.text}</span>
    )
  ) : null;

  return (
    <div className="bg-brand-600 text-white">
      <div className="container-page flex min-h-9 items-center justify-center gap-x-6 font-label text-[10px] font-bold tracking-[0.18em] uppercase sm:justify-between sm:text-[11px]">
        {social.length > 0 && (
          <ul className="hidden items-center gap-1 sm:flex" aria-label="Follow us">
            {social.map(({ href, label, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${settings.storeName} on ${label} (opens in a new tab)`}
                  className="grid h-9 w-9 place-items-center text-white/90 transition-colors hover:text-gold-300"
                >
                  <Icon className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-x-6 py-2">
          {announcement && <span className="hidden text-white/85 lg:inline">{announcement}</span>}
          {phone && (
            <span>
              Call or WhatsApp{' '}
              <a href={`tel:${phone.replace(/\s/g, '')}`} className="tap text-gold-300 hover:text-white">
                {formatKePhone(phone)}
              </a>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
