import { Link } from 'react-router';
import { formatKePhone } from '../../lib/phone';
import { useSite } from '../../state/site';
import { InstagramIcon, TikTokIcon } from '../ui/Icon';

const linkStyle = 'underline decoration-white/40 underline-offset-4 transition-colors hover:decoration-white';

/**
 * Thin logo-blue strip above the header: social icons on the left, the
 * announcement from Settings in the centre, call/WhatsApp number on the right.
 * Below desktop width only the announcement shows (or the number when there is none).
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
        <Link to={a.link} className={linkStyle}>{a.text}</Link>
      ) : (
        <a href={a.link} className={linkStyle} rel="noopener">{a.text}</a>
      )
    ) : (
      <span>{a.text}</span>
    )
  ) : null;

  const phoneLink = phone ? (
    <span>
      Call or WhatsApp{' '}
      <a href={`tel:${phone.replace(/\s/g, '')}`} className={`tap font-semibold ${linkStyle}`}>
        {formatKePhone(phone)}
      </a>
    </span>
  ) : null;

  return (
    <div className="bg-logo-600 text-white">
      <div className="container-page grid min-h-9 items-center gap-x-6 py-1.5 text-center text-[13px] font-medium lg:grid-cols-[1fr_auto_1fr]">
        <div className="hidden lg:flex">
          {social.length > 0 && (
            <ul className="-ml-2 flex items-center" aria-label="Follow us">
              {social.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${settings.storeName} on ${label} (opens in a new tab)`}
                    className="grid h-9 w-9 place-items-center text-white/85 transition-colors hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p>{announcement ?? <span className="lg:hidden">{phoneLink}</span>}</p>
        <p className="hidden justify-end lg:flex">{phoneLink}</p>
      </div>
    </div>
  );
}
