// App-facing domain types (camelCase). Mapped from database rows in /lib/api.

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

export interface CategoryNode extends Category {
  children: Category[];
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  price: number;
  compareAtPrice: number | null;
  hasVariants: boolean;
  isFeatured: boolean;
  room: string | null;
  materials: string | null;
  badge: string | null;
  freeDelivery: boolean;
  madeToOrder: boolean;
  leadTimeDays: number;
  lowStockThreshold: number;
  createdAt: string;
  minPrice: number;
  maxPrice: number;
  totalStock: number;
  imageUrl: string | null;
  /** Colours: the product colour, or the values of its Colour option. */
  colours: string[];
  /** Material tags derived from Fabric/Finish/Material options and the materials text. */
  materialTags: string[];
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
}

export interface ProductOption {
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  sku: string | null;
  optionValues: Record<string, string>;
  /** Resolved price: variant override or the product price. */
  price: number;
  compareAtPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  imageId: string | null;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  hasVariants: boolean;
  stock: number;
  lowStockThreshold: number;
  dimensions: string | null;
  materials: string | null;
  room: string | null;
  colour: string | null;
  leadTimeDays: number;
  madeToOrder: boolean;
  freeDelivery: boolean;
  badge: string | null;
  images: ProductImage[];
  options: ProductOption[];
  variants: ProductVariant[];
}

export interface HeroSlide {
  id: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  headline: string;
  subtext: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  daysMin: number;
  daysMax: number;
  freeThreshold: number | null;
  notes: string | null;
}

export interface SiteSettings {
  storeName: string;
  whatsappNumber: string;
  depositPercent: number;
  contact: { phone: string; email: string; address: string; mapUrl: string | null; mapCoords: string | null };
  openingHours: { days: string; hours: string }[];
  payment: {
    paybill: { businessNumber: string; accountNumber: string };
    till: string;
    bank: { bankName: string; accountName: string; accountNumber: string; branch: string };
    notes: string;
  };
  announcement: { enabled: boolean; text: string; link: string | null };
  /** Social profile links (https URLs); empty string hides the icon. */
  social: { tiktok: string; instagram: string };
  /** Link to the Google reviews page, plus the overall rating and count as shown on Google (owner-entered). */
  googleReviews: { url: string; rating: number | null; count: number | null };
}

export interface CheckoutCustomer {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
}

export interface CheckoutItem {
  productId: string;
  variantId: string | null;
  quantity: number;
}

export interface PlacedOrderLine {
  productId: string;
  variantId: string | null;
  name: string;
  variantLabel: string | null;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  madeToOrder: boolean;
}

/** What create_order returns. Shown on the confirmation page and sent to WhatsApp. */
export interface PlacedOrder {
  orderNumber: string;
  customer: { fullName: string; phone: string };
  deliveryZone: string;
  deliveryZoneNotes: string | null;
  deliveryAddress: string;
  deliveryCity: string;
  preferredDeliveryDate: string | null;
  estimatedDeliveryFrom: string;
  estimatedDeliveryTo: string;
  items: PlacedOrderLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  depositAmount: number;
  balanceDue: number;
  notes: string | null;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'deposit_paid' | 'paid' | 'refunded';

export interface OrderTracking {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  deliveryZone: string | null;
  preferredDeliveryDate: string | null;
  estimatedDeliveryFrom: string | null;
  estimatedDeliveryTo: string | null;
  total: number;
  balanceDue: number;
  items: { name: string; variantLabel: string | null; quantity: number }[];
}

export interface CustomRequestInput {
  customerName: string;
  phone: string;
  email?: string;
  description: string;
  dimensions?: string;
  preferredMaterial?: string;
  budget?: number;
  referenceImage?: File | null;
}
