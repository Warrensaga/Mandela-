import type { Category, ProductSummary } from './api/types';
import { formatKES } from './format';

/**
 * Search keywords per page, taken from what people in Kenya actually type into
 * Google (autocomplete research, Nov 2026; see docs/seo-keywords.md). Kenyan
 * searches lean on place ("in Kenya", "in Nairobi"), price ("prices", "price
 * in Kenya") and style/size words ("L-shaped", "6 by 6", "TV unit").
 *
 * Copy here must stay factual: no "best", "cheapest" or other claims we
 * cannot back up. Prices are always the live ones.
 */
export interface CategoryKeywords {
  /** Page title (before " | Mandela Heritage"), about 45 characters max. */
  title: string;
  /** Keyword-led opening sentence used in the meta description and on the page. */
  lead: string;
  /** Other searches this page should answer (documentation and internal links). */
  related: string[];
}

export const CATEGORY_KEYWORDS: Record<string, CategoryKeywords> = {
  'living-room': {
    title: 'Living Room Furniture in Kenya & Sofa Sets',
    lead: 'Living room furniture in Kenya: sofa sets, L-shaped sofas, armchairs, coffee tables and TV stands',
    related: ['living room sets in kenya', 'sofa sets in kenya', 'living room furniture nairobi'],
  },
  sofas: {
    title: 'Sofa Sets in Kenya & Prices: L-Shaped Sofas',
    lead: 'Sofa sets in Kenya and their prices: 3-seater sofas, L-shaped corner sofas, sofa beds and recliners',
    related: ['sofa sets in kenya and their prices', 'l shaped sofa price in kenya', 'sofa nairobi', 'sofa bed kenya', 'recliner sofa kenya'],
  },
  armchairs: {
    title: 'Armchairs in Kenya: Accent & Recliner Chairs',
    lead: 'Armchairs in Kenya: accent chairs, reading chairs and recliner chairs for the living room',
    related: ['armchairs kenya', 'recliner chair kenya prices', 'accent chairs nairobi'],
  },
  'coffee-tables': {
    title: 'Coffee Tables in Kenya & Wooden Coffee Tables',
    lead: 'Coffee tables in Kenya: wooden coffee tables, round and rectangular, with prices online',
    related: ['coffee table kenya price', 'wooden coffee table kenya', 'side table kenya'],
  },
  'tv-stands': {
    title: 'TV Stands & TV Units in Kenya: Prices',
    lead: 'TV stands and TV units in Kenya: wooden TV consoles and media units for the living room',
    related: ['tv stand kenya price', 'tv unit kenya', 'tv console kenya', 'tv stand designs kenya'],
  },
  'console-and-side-tables': {
    title: 'Side Tables & Console Tables in Kenya',
    lead: 'Side tables and console tables in Kenya for living rooms, hallways and entryways',
    related: ['side table kenya', 'console table kenya', 'small table kenya'],
  },
  'cabinets-and-shelving': {
    title: 'Cabinets & Shelving in Kenya: Display Units',
    lead: 'Cabinets, bookshelves and display units in Kenya for living rooms and offices',
    related: ['cabinets kenya', 'bookshelf kenya', 'display cabinet kenya'],
  },
  dining: {
    title: 'Dining Sets & Dining Tables in Kenya: Prices',
    lead: 'Dining furniture in Kenya: dining table sets, dining tables, dining chairs and sideboards',
    related: ['dining set prices in kenya', 'dining table set price in kenya', 'dining furniture kenya'],
  },
  'dining-sets': {
    title: 'Dining Table Sets in Kenya & Prices',
    lead: 'Dining table sets in Kenya and their prices: dining tables with matching chairs',
    related: ['dining set kenya', 'dining table set price in kenya', 'dining set designs in kenya', 'small dining set kenya'],
  },
  'dining-tables': {
    title: 'Dining Tables in Kenya: Wooden Dining Tables',
    lead: 'Dining tables in Kenya: solid wooden dining tables with prices online',
    related: ['dining table price in kenya', 'dining table designs in kenya', 'wooden dining table kenya'],
  },
  'dining-chairs': {
    title: 'Dining Chairs in Kenya & Prices',
    lead: 'Dining chairs in Kenya: wooden and upholstered dining chairs with prices online',
    related: ['dining chairs kenya prices', 'wooden dining chairs kenya'],
  },
  'bar-stools': {
    title: 'Bar Stools in Kenya: Kitchen & Counter Stools',
    lead: 'Bar stools in Kenya: kitchen, counter and wooden bar stools',
    related: ['bar stools kenya', 'bar chairs kenya', 'counter stools kenya', 'wooden bar stools kenya'],
  },
  sideboards: {
    title: 'Sideboards in Kenya: Sideboard Cabinets',
    lead: 'Sideboards and sideboard cabinets in Kenya for dining rooms and living rooms',
    related: ['sideboard kenya', 'sideboard cabinet kenya', 'sideboard price in kenya'],
  },
  bedroom: {
    title: 'Bedroom Furniture in Kenya: Beds & Wardrobes',
    lead: 'Bedroom furniture in Kenya: beds, wardrobes, dressing tables and bedside tables',
    related: ['bedroom furniture kenya', 'bedroom sets kenya', 'beds in nairobi'],
  },
  'beds-and-bed-frames': {
    title: 'Beds in Kenya & Bed Prices in Nairobi',
    lead: 'Beds and bed frames in Kenya with prices online: wooden beds in the sizes Kenyan homes use',
    related: ['bed prices in kenya', '6 by 6 bed prices in kenya', 'bed prices in kenya 5 by 6', 'beds in nairobi', 'mahogany beds in nairobi'],
  },
  wardrobes: {
    title: 'Wardrobes in Kenya & Wardrobe Prices',
    lead: 'Wardrobes in Kenya and their prices: wooden wardrobes and cupboards for the bedroom',
    related: ['wardrobe prices in kenya', 'wardrobes nairobi', 'cupboard prices in kenya'],
  },
  'dressing-tables': {
    title: 'Dressing Tables in Kenya: Vanity Tables',
    lead: 'Dressing tables and vanity tables in Kenya, in wood, with prices online',
    related: ['dressing table price in kenya', 'vanity table kenya', 'wooden dressing table kenya'],
  },
  'bedside-tables': {
    title: 'Bedside Tables in Kenya: Bedside Cabinets',
    lead: 'Bedside tables and bedside cabinets in Kenya, in wood, with prices online',
    related: ['bedside table kenya', 'bedside cabinet kenya', 'bedside table price in kenya'],
  },
  'chests-of-drawers': {
    title: 'Chests of Drawers in Kenya',
    lead: 'Chests of drawers and drawer cabinets in Kenya for bedroom storage',
    related: ['chest of drawers kenya', 'drawers kenya'],
  },
  'mattresses-and-bedding': {
    title: 'Mattress Prices in Kenya: Mattresses & Pillows',
    lead: 'Mattress prices in Kenya: mattresses, pillows and bedding in standard Kenyan sizes',
    related: ['mattress prices in kenya', 'mattress prices in kenya 5 by 6', 'mattress prices in kenya 6 by 6', 'mattress kenya nairobi'],
  },
  office: {
    title: 'Office Furniture in Nairobi: Desks & Chairs',
    lead: 'Office furniture in Nairobi and across Kenya: office desks, office chairs, reception and storage',
    related: ['office furniture nairobi', 'office furniture nairobi prices', 'office furniture kenya'],
  },
  'office-desks': {
    title: 'Office Desks in Kenya: Office Table Prices',
    lead: 'Office desks and office tables in Kenya, for home offices and businesses',
    related: ['office desk kenya price', 'office table kenya', 'home office desk kenya'],
  },
  'office-chairs': {
    title: 'Office Chairs in Nairobi: Ergonomic Chairs',
    lead: 'Office chairs in Nairobi and across Kenya: ergonomic, executive and desk chairs',
    related: ['office chairs nairobi', 'orthopedic office chairs nairobi', 'desk chairs nairobi'],
  },
  'reception-furniture': {
    title: 'Reception Furniture in Kenya: Reception Desks',
    lead: 'Reception furniture in Kenya: reception desks and waiting-area seating',
    related: ['reception desk kenya', 'reception furniture nairobi'],
  },
  'filing-and-storage': {
    title: 'Filing Cabinets & Office Storage in Kenya',
    lead: 'Filing cabinets and office storage in Kenya',
    related: ['filing cabinets kenya', 'office storage kenya'],
  },
  'outdoor-and-garden': {
    title: 'Outdoor & Garden Furniture in Kenya',
    lead: 'Outdoor and garden furniture in Kenya: patio sets, garden chairs and loungers',
    related: ['outdoor furniture kenya', 'garden furniture kenya', 'patio furniture nairobi'],
  },
  'patio-sets': {
    title: 'Patio Furniture Sets in Kenya',
    lead: 'Patio furniture sets in Kenya: outdoor tables and chairs for gardens and balconies',
    related: ['patio furniture kenya', 'outdoor dining set kenya', 'outdoor table kenya'],
  },
  'garden-chairs': {
    title: 'Garden Chairs in Kenya: Outdoor Chairs',
    lead: 'Garden chairs and outdoor chairs in Kenya',
    related: ['outdoor chairs kenya', 'garden chairs kenya'],
  },
  loungers: {
    title: 'Sun Loungers in Kenya: Outdoor Loungers',
    lead: 'Sun loungers and outdoor loungers in Kenya for gardens and poolsides',
    related: ['sun loungers kenya', 'outdoor loungers kenya'],
  },
  'home-decor': {
    title: 'Home Decor in Kenya: Rugs, Mirrors & Lighting',
    lead: 'Home decor in Kenya: rugs, mirrors, lighting and wall art',
    related: ['home decor kenya', 'home decor nairobi'],
  },
  rugs: {
    title: 'Rugs in Nairobi & Rug Prices in Kenya',
    lead: 'Rugs in Nairobi and across Kenya for living rooms and bedrooms',
    related: ['rugs nairobi', 'woven rugs nairobi', 'rugs kenya prices'],
  },
  mirrors: {
    title: 'Mirrors in Kenya: Wall & Floor Mirrors',
    lead: 'Mirrors in Kenya: wall mirrors and floor mirrors for the home',
    related: ['mirrors kenya', 'wall mirror kenya'],
  },
  lighting: {
    title: 'Lamps & Lighting in Kenya',
    lead: 'Lamps and lighting in Kenya: floor lamps, table lamps and pendant lights',
    related: ['lamps kenya', 'lighting nairobi'],
  },
  'wall-art': {
    title: 'Wall Art in Kenya: Wall Decor',
    lead: 'Wall art and wall decor in Kenya',
    related: ['wall art kenya', 'wall decor nairobi'],
  },
};

/** Falls back to a sensible default for categories added later in the admin. */
export function categoryKeywords(category: Pick<Category, 'slug' | 'name'>): CategoryKeywords {
  return (
    CATEGORY_KEYWORDS[category.slug] ?? {
      title: `${category.name} in Kenya & Prices`,
      lead: `${category.name} in Kenya with prices online`,
      related: [],
    }
  );
}

/** Live price and count facts for a set of products (a category and its sub-categories). */
export function priceFacts(products: Pick<ProductSummary, 'minPrice'>[]): { count: number; from: number | null } {
  const prices = products.map((p) => p.minPrice).filter((n) => n > 0);
  return { count: products.length, from: prices.length ? Math.min(...prices) : null };
}

/** Meta description for a category page: keyword lead + live "from" price + delivery. */
export function categoryDescription(kw: CategoryKeywords, facts: { from: number | null }): string {
  const price = facts.from ? `, from ${formatKES(facts.from)}` : '';
  return `${kw.lead}${price}. Made in our Nairobi workshop and delivered across Kenya, with fast delivery in Nairobi.`;
}

/** Page titles and descriptions for the fixed pages. */
export const PAGE_KEYWORDS = {
  home: {
    title: 'Furniture Shop in Nairobi, Kenya | Mandela Heritage Furniture',
    description:
      'Furniture shop in Nairobi with prices online: sofa sets, beds, dining tables, wardrobes and office furniture. Made in our workshop, delivered across Kenya.',
  },
  shop: {
    title: 'Shop Furniture Online in Kenya with Prices',
    description:
      'Shop furniture online in Kenya with prices: sofa sets, beds, dining sets, wardrobes and office furniture. Filter by room, material and price. Delivered across Kenya.',
  },
  offers: {
    title: 'Furniture Offers & Deals in Kenya',
    description: 'Furniture offers and deals in Kenya: sofas, beds, dining and more at reduced prices, delivered across Kenya.',
  },
  collections: {
    title: 'Furniture Categories in Kenya',
    description:
      'Browse furniture by category: living room, dining, bedroom, mattresses, office, outdoor and home decor. Prices online, delivered across Kenya.',
  },
  custom: {
    title: 'Custom Made Furniture in Nairobi',
    description:
      'Custom made furniture in Nairobi: sofas, beds, dining tables and wardrobes made to your size, fabric and finish in our workshop. Send your idea and get a quote.',
  },
  contact: {
    title: 'Furniture Showroom in Nairobi: Visit or Call',
    description:
      'Visit our furniture showroom in Nairobi, or call and WhatsApp us. Opening hours, directions and contact details for Mandela Heritage Furniture.',
  },
  delivery: {
    title: 'Furniture Delivery in Nairobi & Across Kenya',
    description:
      'Furniture delivery in Nairobi, Mombasa, Kisumu, Nakuru and across Kenya: delivery areas, fees and how long delivery takes.',
  },
  payment: {
    title: 'Payment Options: M-Pesa & Bank Transfer',
    description: 'How to pay for furniture: we confirm your order on WhatsApp first, then you pay by M-Pesa or bank transfer.',
  },
} as const;
