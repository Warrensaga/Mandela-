import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export interface CartLine {
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  variantLabel: string | null;
  sku: string | null;
  /** Display price at the time it was added. The database recalculates at checkout. */
  unitPrice: number;
  compareAtPrice: number | null;
  imageUrl: string | null;
  quantity: number;
  /** Stock limit for the quantity picker (99 for made-to-order). */
  maxQuantity: number;
  madeToOrder: boolean;
  freeDelivery: boolean;
  leadTimeDays: number;
}

export const lineKey = (l: Pick<CartLine, 'productId' | 'variantId'>) => `${l.productId}:${l.variantId ?? ''}`;

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  allFreeDelivery: boolean;
  hasMadeToOrder: boolean;
  maxLeadTimeDays: number;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  add: (line: CartLine) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  /** Applies live prices/stock; returns keys of lines that changed. */
  reconcile: (updates: Map<string, { price: number; stock: number; available: boolean; madeToOrder: boolean }>) => string[];
  clear: () => void;
}

const STORAGE_KEY = 'mh-cart-v1';
const MAX_QTY = 99;

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartLine[]).filter((l) => l && l.productId && l.quantity > 0) : [];
  } catch {
    return [];
  }
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage full or blocked: cart still works for this visit */
    }
  }, [lines]);

  // Keep tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && setLines(load());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((line: CartLine) => {
    setLines((current) => {
      const key = lineKey(line);
      const existing = current.find((l) => lineKey(l) === key);
      const limit = Math.min(line.maxQuantity, MAX_QTY);
      if (existing) {
        return current.map((l) =>
          lineKey(l) === key ? { ...line, quantity: Math.min(l.quantity + line.quantity, limit) } : l,
        );
      }
      return [...current, { ...line, quantity: Math.min(line.quantity, limit) }];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((current) =>
      current
        .map((l) => (lineKey(l) === key ? { ...l, quantity: Math.max(0, Math.min(quantity, l.maxQuantity, MAX_QTY)) } : l))
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const remove = useCallback((key: string) => setLines((c) => c.filter((l) => lineKey(l) !== key)), []);
  const clear = useCallback(() => setLines([]), []);

  const linesRef = useRef(lines);
  linesRef.current = lines;

  const reconcile = useCallback<CartContextValue['reconcile']>((updates) => {
    const changed: string[] = [];
    const next = linesRef.current.map((l) => {
      const u = updates.get(lineKey(l));
      if (!u) return l;
      const maxQuantity = u.available ? (u.madeToOrder ? MAX_QTY : Math.max(0, u.stock)) : 0;
      if (u.price !== l.unitPrice || maxQuantity < l.quantity || !u.available) changed.push(lineKey(l));
      // Keep the quantity so the shopper sees what changed; checkout blocks until fixed.
      return { ...l, unitPrice: u.price, maxQuantity, madeToOrder: u.madeToOrder };
    });
    setLines(next);
    return changed;
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    return {
      lines,
      count,
      subtotal,
      allFreeDelivery: lines.length > 0 && lines.every((l) => l.freeDelivery),
      hasMadeToOrder: lines.some((l) => l.madeToOrder),
      maxLeadTimeDays: lines.reduce((m, l) => Math.max(m, l.leadTimeDays), 0),
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      add,
      setQuantity,
      remove,
      reconcile,
      clear,
    };
  }, [lines, drawerOpen, add, setQuantity, remove, reconcile, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
