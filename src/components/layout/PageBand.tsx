import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Reveal } from '../ui/Reveal';

interface PageBandProps {
  title: ReactNode;
  description?: ReactNode;
  crumbs?: { to?: string; label: string }[];
  aside?: ReactNode;
  /** Light grey band (default) or a navy band. */
  tone?: 'dark' | 'light';
}

/** Page title band: breadcrumb, serif page title, optional description and right-hand slot. */
export function PageBand({ title, description, crumbs, aside, tone = 'light' }: PageBandProps) {
  return (
    <div className={tone === 'dark' ? 'theme-dark' : 'border-b border-paper-200 bg-paper-100'}>
      <Reveal className="container-page py-8 sm:py-12">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-muted">
            <ol className="flex flex-wrap items-center gap-2">
              {crumbs.map((c, i) => (
                <li key={c.label} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {c.to ? (
                    <Link to={c.to} className="tap hover:text-brand-600">{c.label}</Link>
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
            <h1 className="text-4xl leading-tight sm:text-5xl">{title}</h1>
            {description && <p className="mt-3 text-base leading-relaxed text-muted">{description}</p>}
          </div>
          {aside}
        </div>
      </Reveal>
    </div>
  );
}
