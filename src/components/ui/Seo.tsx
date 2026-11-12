import { isValidElement, type ReactNode } from 'react';
import { absUrl, breadcrumbLd, SEO_DEFAULT_DESCRIPTION, type Crumb } from '../../lib/seo';
import { useSite } from '../../state/site';

interface SeoProps {
  title?: string;
  description?: string | null;
  image?: string | null;
  /** JSON-LD structured data object(s). */
  jsonLd?: object | object[];
  /** Breadcrumb trail, emitted as BreadcrumbList structured data. */
  breadcrumbs?: Crumb[];
  /** Canonical path; defaults to the current path without query string. */
  path?: string;
  type?: 'website' | 'product' | 'article';
  noindex?: boolean;
}

/** Plain text of a React node (for meta descriptions and FAQ answers). */
export function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return '';
}

/** Search engines show about 155 characters; cut at a word boundary. */
function clip(text: string, max = 158): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

/** Per-page meta tags. React 19 hoists <title>/<meta>/<link> into <head>. */
export function Seo({ title, description, image, jsonLd, breadcrumbs, path, type = 'website', noindex }: SeoProps) {
  const { settings } = useSite();
  const fullTitle = title ? `${title} | ${settings.storeName}` : `${settings.storeName} | Quality Furniture in Kenya`;
  const desc = clip(description || SEO_DEFAULT_DESCRIPTION);
  const canonical = absUrl(path ?? (typeof window !== 'undefined' ? window.location.pathname : '/'));
  const ogImage = absUrl(image || '/logo.png');
  const data = [...(jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []), ...(breadcrumbs?.length ? [breadcrumbLd(breadcrumbs)] : [])];

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="robots" content={noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1'} />
      {!noindex && <link rel="canonical" href={canonical} />}
      <meta property="og:site_name" content={settings.storeName} />
      <meta property="og:locale" content="en_KE" />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
      {data.length > 0 && (
        <script type="application/ld+json">{JSON.stringify(data.length === 1 ? data[0] : data).replace(/</g, '\\u003c')}</script>
      )}
    </>
  );
}
