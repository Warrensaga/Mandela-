/** Error raised by the data layer with a friendly, customer-facing message. */
export class ApiError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.field = typeof details?.field === 'string' ? details.field : undefined;
  }
}

const MESSAGES: Record<string, string> = {
  INVALID_NAME: 'Please enter your full name.',
  INVALID_PHONE: 'Please enter a valid Kenyan phone number, for example 0712 345 678.',
  INVALID_EMAIL: 'That email address does not look right.',
  INVALID_ADDRESS: 'Please enter your delivery address and town.',
  INVALID_DATE: 'Please choose a delivery date from today onwards.',
  INVALID_ZONE: 'Please choose a delivery area.',
  EMPTY_CART: 'Your cart is empty.',
  TOO_MANY_ITEMS: 'Your cart has too many lines. Please place two orders or contact us on WhatsApp.',
  INVALID_ITEM: 'Something in your cart is not valid. Please remove it and add it again.',
  INVALID_QUANTITY: 'Quantities must be between 1 and 99.',
  PRODUCT_UNAVAILABLE: 'One of the products in your cart is no longer available.',
  VARIANT_REQUIRED: 'Please choose all options (for example size and colour) before ordering.',
  VARIANT_UNAVAILABLE: 'One of the options you chose is no longer available.',
  OUT_OF_STOCK: 'Sorry, we do not have enough stock for one of your items.',
  INVALID_DESCRIPTION: 'Please describe the piece you would like (at least a sentence).',
  INVALID_BUDGET: 'Please enter a valid budget in KES.',
  INVALID_IMAGE_PATH: 'The reference image could not be attached. Please try again.',
  UPLOAD_FAILED: 'We could not upload your image. Please try a smaller JPG or PNG.',
  NOT_FOUND: 'We could not find that.',
  RATE_LIMITED: 'Too many attempts from this connection. Please wait a little while and try again, or contact us on WhatsApp.',
  NETWORK: 'We could not reach the server. Please check your connection and try again.',
  // Admin
  NOT_AUTHORIZED: 'Your account does not have permission to do that.',
  INVALID_OPTIONS: 'Please check the options.',
  DUPLICATE_VARIANT: 'That change would make two variants identical.',
  QUOTE_REQUIRED: 'Set a quoted price before converting this request.',
  ALREADY_CONVERTED: 'This request already has an order.',
  STOCK_WOULD_GO_NEGATIVE: 'Stock cannot go below zero.',
  INVALID_CHANGE: 'Enter a quantity other than zero.',
  INVALID_REASON: 'Choose restock, adjustment or return.',
  ORDER_CANCELLED_FINAL: 'A cancelled order cannot be re-opened. Create a new order instead.',
  CATEGORY_TOO_DEEP: 'Sub-categories cannot have their own sub-categories.',
  CATEGORY_HAS_CHILDREN: 'A category with sub-categories cannot become a sub-category.',
  INVALID_VARIANT_OPTION: 'That variant uses an option value that does not exist.',
  INVALID_VARIANT_IMAGE: 'Pick an image that belongs to this product.',
  PRODUCT_NOT_FOUND: 'Product not found.',
  INVALID_TABLE: 'That list cannot be reordered.',
  CANNOT_CHANGE_SELF: 'You cannot change your own access. Ask another owner.',
  IN_USE:'This is still in use (for example by products or past orders), so it cannot be deleted. Deactivate it instead.',
  DUPLICATE: 'That already exists. Use a different name, slug or SKU.',
  CONSTRAINT: 'Some values are not allowed. Check prices are above zero and quantities are whole numbers.',
};

// Postgres error codes surfaced by direct table writes from the admin.
const PG_CODES: Record<string, string> = { '23503': 'IN_USE', '23505': 'DUPLICATE', '23514': 'CONSTRAINT', '42501': 'NOT_AUTHORIZED' };

interface PostgrestLikeError {
  message?: string;
  details?: string | null;
  code?: string;
}

/** Converts a Supabase/PostgREST error into an ApiError with a friendly message. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const e = (error ?? {}) as PostgrestLikeError;
  const code =
    e.message && MESSAGES[e.message] ? e.message : e.code && PG_CODES[e.code] ? (PG_CODES[e.code] as string) : 'UNKNOWN';

  let details: Record<string, unknown> | undefined;
  if (e.details) {
    try {
      const parsed: unknown = JSON.parse(e.details);
      if (parsed && typeof parsed === 'object') details = parsed as Record<string, unknown>;
    } catch {
      details = { text: e.details };
    }
  }

  if (code === 'OUT_OF_STOCK' && details?.product) {
    const name = [details.product, details.variant].filter(Boolean).join(' (') + (details.variant ? ')' : '');
    const available = Number(details.available ?? 0);
    return new ApiError(
      code,
      available > 0
        ? `Only ${available} left of ${name}. Please reduce the quantity.`
        : `${name} has just sold out. Please remove it from your cart.`,
      details,
    );
  }

  if (code === 'UNKNOWN') {
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    return new ApiError(
      offline ? 'NETWORK' : 'UNKNOWN',
      offline ? (MESSAGES.NETWORK as string) : 'Something went wrong. Please try again, or contact us on WhatsApp.',
      details,
    );
  }
  // Admin validation errors carry a specific sentence in DETAIL; prefer it.
  if (['INVALID_OPTIONS', 'DUPLICATE_VARIANT', 'QUOTE_REQUIRED', 'INVALID_VARIANT_OPTION'].includes(code) && typeof details?.text === 'string') {
    return new ApiError(code, details.text, details);
  }
  return new ApiError(code, MESSAGES[code] as string, details);
}

export function messageFor(code: string): string {
  return MESSAGES[code] ?? 'Something went wrong.';
}
