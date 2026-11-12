import type { ProductDetail, ProductVariant } from '../api/types';

export type Selection = Record<string, string>;

export type ValueState =
  | { kind: 'available' }
  | { kind: 'out_of_stock'; reason: string }
  | { kind: 'unavailable'; reason: string };

function matches(variant: ProductVariant, selection: Selection, ignore?: string): boolean {
  return Object.entries(selection).every(([name, value]) => name === ignore || variant.optionValues[name] === value);
}

/** Selects any option that only has one value, so shoppers are not asked a pointless question. */
export function initialSelection(product: ProductDetail): Selection {
  const sel: Selection = {};
  for (const opt of product.options) {
    if (opt.values.length === 1 && opt.values[0]) sel[opt.name] = opt.values[0];
  }
  return sel;
}

export function isComplete(product: ProductDetail, selection: Selection): boolean {
  return product.options.every((o) => Boolean(selection[o.name]));
}

export function missingOptions(product: ProductDetail, selection: Selection): string[] {
  return product.options.filter((o) => !selection[o.name]).map((o) => o.name);
}

/** The variant for a complete selection, or undefined (incomplete or combination not offered). */
export function findVariant(product: ProductDetail, selection: Selection): ProductVariant | undefined {
  if (!isComplete(product, selection)) return undefined;
  return product.variants.find((v) => matches(v, selection));
}

/**
 * Whether choosing `value` for `optionName` (keeping the other choices) leads to
 * a buyable variant. Unavailable values stay visible with the reason.
 */
export function valueState(product: ProductDetail, selection: Selection, optionName: string, value: string): ValueState {
  const candidates = product.variants.filter(
    (v) => v.optionValues[optionName] === value && matches(v, selection, optionName),
  );
  if (candidates.length === 0) {
    const others = Object.entries(selection)
      .filter(([name]) => name !== optionName)
      .map(([, v]) => v);
    return {
      kind: 'unavailable',
      reason: others.length ? `Not available with ${others.join(' / ')}` : 'Not currently available',
    };
  }
  if (!product.madeToOrder && candidates.every((v) => v.stock <= 0)) {
    return { kind: 'out_of_stock', reason: 'Out of stock' };
  }
  return { kind: 'available' };
}

export type StockState =
  | { kind: 'in_stock'; label: string }
  | { kind: 'low'; label: string; count: number }
  | { kind: 'out'; label: string }
  | { kind: 'made_to_order'; label: string };

export function stockState(stock: number, lowThreshold: number, madeToOrder: boolean, leadTimeDays = 0): StockState {
  if (madeToOrder) {
    return {
      kind: 'made_to_order',
      label: leadTimeDays > 0 ? `Made to order, about ${Math.ceil(leadTimeDays / 7)} weeks` : 'Made to order',
    };
  }
  if (stock <= 0) return { kind: 'out', label: 'Out of stock' };
  if (stock <= lowThreshold) return { kind: 'low', label: `Only ${stock} left`, count: stock };
  return { kind: 'in_stock', label: 'In stock' };
}

export function variantLabel(product: ProductDetail, variant: ProductVariant): string {
  return product.options
    .map((o) => variant.optionValues[o.name])
    .filter(Boolean)
    .join(' / ');
}

export function priceRange(product: ProductDetail): { min: number; max: number } {
  if (!product.hasVariants || product.variants.length === 0) return { min: product.price, max: product.price };
  const prices = product.variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** Total stock across active variants (or the product stock for simple products). */
export function totalStock(product: ProductDetail): number {
  return product.hasVariants ? product.variants.reduce((sum, v) => sum + v.stock, 0) : product.stock;
}

const SWATCHES: Record<string, string> = {
  grey: '#8a8a8a', gray: '#8a8a8a', navy: '#1f2a44', beige: '#d8c3a5', black: '#1c1c1c', white: '#f7f5f0',
  cream: '#efe6d2', terracotta: '#b5563a', olive: '#6b6b3a', brown: '#5c3d2e', green: '#2f4a3a',
  blue: '#2c4a7a', red: '#9b2d2d', mahogany: '#6b2e1f', walnut: '#5c3d2e', 'natural oak': '#c8a46e',
  oak: '#c8a46e', ebony: '#2a211c', natural: '#c8a46e', gold: '#b8923a', brass: '#b5a642',
};

/** Hex colour for a swatch, or null when the value is not a known colour/finish. */
export function swatchColour(value: string): string | null {
  return SWATCHES[value.toLowerCase()] ?? null;
}

export function isSwatchOption(name: string): boolean {
  return ['colour', 'color', 'finish'].includes(name.toLowerCase());
}
