import { useSite } from '../../state/site';

interface SeoProps {
  title?: string;
  description?: string;
  image?: string | null;
  /** JSON-LD structured data object(s). */
  jsonLd?: object | object[];
  noindex?: boolean;
}

/** Per-page meta tags. React 19 hoists <title>/<meta>/<link> into <head>. */
export function Seo({ title, description, image, jsonLd, noindex }: SeoProps) {
  const { settings } = useSite();
  const fullTitle = title ? `${title} | ${settings.storeName}` : `${settings.storeName}: Heritage furniture for Kenyan homes`;
  const desc =
    description ??
    'Heritage furniture for Kenyan homes. Sofas, dining, bedroom and custom pieces, delivered across Kenya.';
  const url = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : undefined;
  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {url && <link rel="canonical" href={url} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}
      {noindex && <meta name="robots" content="noindex" />}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </>
  );
}
