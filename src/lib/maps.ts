import { env } from './env';

/**
 * Google Maps for the showroom.
 * - With VITE_GOOGLE_MAPS_API_KEY set: the Maps Embed API (place mode).
 * - Without a key: Google's standard embeddable map, which needs no key.
 * Settings → Contact (admin) controls the pin: exact coordinates win, then the
 * address; the owner's Google Maps link opens their business listing.
 */

const PLACEHOLDER = /to be confirmed|^\s*$/i;

export interface ShowroomLocation {
  /** What Google uses to place the pin ("lat,lng" or an address). */
  query: string;
  /** False while the owner has not entered a real location yet. */
  exact: boolean;
}

export function showroomLocation(address: string | null | undefined, coords?: string | null): ShowroomLocation {
  if (coords) return { query: coords, exact: true };
  if (!address || PLACEHOLDER.test(address)) return { query: 'Nairobi, Kenya', exact: false };
  return { query: /kenya/i.test(address) ? address : `${address}, Kenya`, exact: true };
}

export function mapEmbedUrl(loc: ShowroomLocation): string {
  const q = encodeURIComponent(loc.query);
  if (env.googleMapsApiKey) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(env.googleMapsApiKey)}&q=${q}&zoom=${loc.exact ? 17 : 11}`;
  }
  return `https://www.google.com/maps?q=${q}&z=${loc.exact ? 17 : 11}&output=embed`;
}

/** Opens Google Maps (the app on phones): the owner's listing link when set. */
export function mapOpenUrl(loc: ShowroomLocation, ownerLink?: string | null): string {
  if (ownerLink && /^https:\/\//.test(ownerLink)) return ownerLink;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.query)}`;
}

export function mapDirectionsUrl(loc: ShowroomLocation): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.query)}`;
}
