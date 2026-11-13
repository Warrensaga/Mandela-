import { useSite } from '../../state/site';
import { InstagramIcon, TikTokIcon } from '../ui/Icon';

/**
 * TikTok and Instagram icons from Settings (hidden when a link is empty).
 * `tone` picks colours for light or dark backgrounds.
 */
export function SocialLinks({ tone = 'light', className = '' }: { tone?: 'light' | 'dark'; className?: string }) {
  const { settings } = useSite();
  const links = [
    { href: settings.social.tiktok, label: 'TikTok', Icon: TikTokIcon },
    { href: settings.social.instagram, label: 'Instagram', Icon: InstagramIcon },
  ].filter((l) => l.href);
  if (!links.length) return null;

  const btn =
    tone === 'dark'
      ? 'border-white/25 text-white hover:border-gold-500 hover:bg-gold-500 hover:text-navy-900'
      : 'border-paper-300 text-navy-800 hover:border-brand-600 hover:bg-brand-600 hover:text-on-brand';
  return (
    <ul className={`flex items-center gap-2 ${className}`}>
      {links.map(({ href, label, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${settings.storeName} on ${label} (opens in a new tab)`}
            className={`grid h-11 w-11 place-items-center border transition-colors ${btn}`}
          >
            <Icon className="h-5 w-5" />
          </a>
        </li>
      ))}
    </ul>
  );
}
