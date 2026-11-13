import type { Category, ProductDetail, ProductSummary, SiteSettings } from './api/types';

/**
 * SEO helpers: canonical URLs and schema.org JSON-LD builders.
 * Canonical links use VITE_SITE_URL (the live domain) when it is set, so
 * preview deployments never compete with the real site in search results.
 */
export function siteUrl(): string {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (configured && /^https:\/\/[^/\s]+$/.test(configured.replace(/\/+$/, ''))) return configured.replace(/\/+$/, '');
  return typeof window !== 'undefined' ? window.location.origin : '';
}

/** Absolute URL for a site path ("/shop") or an already absolute https URL. */
export function absUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${siteUrl()}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absUrl(c.path) })),
  };
}

export const SEO_DEFAULT_DESCRIPTION =
  'Buy quality sofas, beds, dining sets and custom furniture online in Kenya. Crafted in Nairobi, delivered across Kenya, order on WhatsApp and pay on confirmation.';

/** The store as a business: used on the home and contact pages. */
export function storeLd(settings: SiteSettings) {
  const base = siteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    '@id': `${base}/#store`,
    name: settings.storeName,
    url: `${base}/`,
    logo: `${base}/logo.png`,
    image: `${base}/logo.png`,
    description: SEO_DEFAULT_DESCRIPTION,
    telephone: settings.contact.phone || undefined,
    email: settings.contact.email || undefined,
    address: settings.contact.address
      ? { '@type': 'PostalAddress', streetAddress: settings.contact.address, addressLocality: 'Nairobi', addressCountry: 'KE' }
      : { '@type': 'PostalAddress', addressLocality: 'Nairobi', addressCountry: 'KE' },
    geo: settings.contact.mapCoords
      ? {
          '@type': 'GeoCoordinates',
          latitude: Number(settings.contact.mapCoords.split(',')[0]),
          longitude: Number(settings.contact.mapCoords.split(',')[1]),
        }
      : undefined,
    hasMap: settings.contact.mapUrl ?? undefined,
    // Free-text hours from Settings, e.g. "Mon - Sat: 8am - 6pm".
    openingHours: settings.openingHours.length ? settings.openingHours.map((h) => `${h.days} ${h.hours}`.trim()) : undefined,
    currenciesAccepted: 'KES',
    paymentAccepted: 'M-Pesa, Bank transfer',
    priceRange: 'KES',
    areaServed: { '@type': 'Country', name: 'Kenya' },
    sameAs: [settings.social.tiktok, settings.social.instagram].filter(Boolean),
  };
}

/** WebSite with a search box (lets Google show a site search for brand queries). */
export function websiteLd(settings: SiteSettings) {
  const base = siteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    name: settings.storeName,
    url: `${base}/`,
    inLanguage: 'en-KE',
    publisher: { '@id': `${base}/#store` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${base}/shop?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

const KES = 'KES';
const NEW = 'https://schema.org/NewCondition';

function availability(stock: number, madeToOrder: boolean): string {
  if (madeToOrder) return 'https://schema.org/PreOrder';
  return stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
}

/** Kenya-only shipping, so Google can show delivery in product results. */
function shippingLd() {
  return {
    '@type': 'OfferShippingDetails',
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'KE' },
  };
}

/** Maps option names to the schema.org properties Google reads for variants. */
const VARIANT_PROPERTY: Record<string, 'color' | 'size' | 'material'> = {
  colour: 'color',
  color: 'color',
  size: 'size',
  material: 'material',
  fabric: 'material',
  finish: 'material',
};

function variantAttributes(optionValues: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(optionValues)) {
    const prop = VARIANT_PROPERTY[name.toLowerCase()];
    if (prop) out[prop] = out[prop] ? `${out[prop]}, ${value}` : value;
  }
  return out;
}

/**
 * Product structured data. Products with variations are a ProductGroup with
 * one Product per variant (Google's variant markup), like the leading stores use.
 */
export function productLd(product: ProductDetail, category: Pick<Category, 'name'> | null | undefined, settings: SiteSettings) {
  const url = absUrl(`/product/${product.slug}`);
  const images = product.images.map((i) => absUrl(i.url));
  const brand = { '@type': 'Brand', name: settings.storeName };
  const seller = { '@type': 'Organization', name: settings.storeName };
  const common = {
    description: product.description ?? undefined,
    brand,
    category: category?.name,
    material: product.materials ?? undefined,
    color: product.colour ?? undefined,
  };

  if (!product.hasVariants || product.variants.length === 0) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `${url}#product`,
      name: product.name,
      url,
      image: images,
      sku: product.sku ?? undefined,
      ...common,
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: KES,
        price: product.price,
        itemCondition: NEW,
        availability: availability(product.stock, product.madeToOrder),
        seller,
        shippingDetails: shippingLd(),
      },
    };
  }

  const imageById = new Map(product.images.map((i) => [i.id, absUrl(i.url)]));
  return {
    '@context': 'https://schema.org',
    '@type': 'ProductGroup',
    '@id': `${url}#product`,
    name: product.name,
    url,
    image: images,
    productGroupID: product.sku ?? product.slug,
    variesBy: [...new Set(product.options.map((o) => VARIANT_PROPERTY[o.name.toLowerCase()]).filter(Boolean))].map(
      (p) => `https://schema.org/${p}`,
    ),
    ...common,
    hasVariant: product.variants.map((v) => {
      const label = Object.values(v.optionValues).join(' / ');
      return {
        '@type': 'Product',
        name: label ? `${product.name} (${label})` : product.name,
        sku: v.sku ?? undefined,
        image: (v.imageId && imageById.get(v.imageId)) || images[0],
        ...variantAttributes(v.optionValues),
        offers: {
          '@type': 'Offer',
          url,
          priceCurrency: KES,
          price: v.price,
          itemCondition: NEW,
          availability: availability(v.stock, product.madeToOrder),
          seller,
          shippingDetails: shippingLd(),
        },
      };
    }),
  };
}

/** A category or shop page as a list of products (positions match the grid). */
export function itemListLd(name: string, path: string, products: Pick<ProductSummary, 'slug' | 'name'>[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: absUrl(path),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.slice(0, 50).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: absUrl(`/product/${p.slug}`),
        name: p.name,
      })),
    },
  };
}

/** The projects page as a list of furnished spaces. */
export function projectListLd(projects: { slug: string; title: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Furnishing projects',
    url: absUrl('/projects'),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: projects.length,
      itemListElement: projects.slice(0, 50).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: absUrl(`/projects/${p.slug}`), name: p.title })),
    },
  };
}

/** One furnishing project: a photo set by the business, described as a creative work. */
export function projectLd(
  p: { slug: string; title: string; summary: string | null; completedOn: string | null; location: string | null; coverImageUrl: string | null; gallery: string[] },
  settings: SiteSettings,
) {
  const images = [p.coverImageUrl, ...p.gallery].filter((u): u is string => Boolean(u)).slice(0, 10);
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: p.title,
    url: absUrl(`/projects/${p.slug}`),
    ...(p.summary ? { description: p.summary } : {}),
    ...(images.length ? { image: images } : {}),
    ...(p.completedOn ? { dateCreated: p.completedOn } : {}),
    ...(p.location ? { locationCreated: { '@type': 'Place', name: p.location } } : {}),
    creator: { '@type': 'FurnitureStore', name: settings.storeName, url: absUrl('/') },
  };
}

export function faqLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
  };
}
