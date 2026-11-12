import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface PageBandProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  crumbs?: { to?: string; label: string }[];
  aside?: ReactNode;
  /** Light band (contact, cart) or dark band (shop, collections, products). */
  tone?: 'dark' | 'light';
}

/** Page title band: breadcrumb, gold eyebrow, large serif title, optional right-hand slot. */
export function PageBand({ eyebrow, title, description, crumbs, aside, tone = 'dark' }: PageBandProps) {
  return (
    <div className={`${tone === 'dark' ? 'theme-dark' : 'border-b border-paper-200 bg-paper-100'} relative overflow-hidden`}>
      {tone === 'dark' && (
        <span className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-brand-600/25 blur-3xl" aria-hidden="true" />
      )}
      <div className="container-page relative py-10 sm:py-14">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-6 font-label text-[10px] tracking-[0.14em] text-muted uppercase">
            <ol className="flex flex-wrap items-center gap-2">
              {crumbs.map((c, i) => (
                <li key={c.label} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {c.to ? (
                    <Link to={c.to} className="tap hover:text-gold-500">{c.label}</Link>
                  ) : (
                    <span aria-current="page" className="text-navy-800">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="eyebrow eyebrow-line">{eyebrow}</p>
            <h1 className="mt-4 text-5xl leading-[1.02] sm:text-6xl">{title}</h1>
            {description && <p className="mt-4 text-base leading-relaxed text-muted">{description}</p>}
          </div>
          {aside}
        </div>
      </div>
    </div>
  );
}
