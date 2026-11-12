import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Saved items ("wishlist") kept on this device only, no account needed.
 * Only product IDs are stored; names, prices and photos always come from the
 * live catalogue, so inactive or deleted products simply drop out.
 */
const STORAGE_KEY = 'mh-saved-v1';
const MAX_SAVED = 100;

function load(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_SAVED) : [];
  } catch {
    return [];
  }
}

interface SavedContextValue {
  ids: string[];
  count: number;
  isSaved: (productId: string) => boolean;
  toggle: (productId: string) => boolean;
  remove: (productId: string) => void;
  clear: () => void;
}

const SavedContext = createContext<SavedContextValue | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* storage blocked: saving still works for this visit */
    }
  }, [ids]);

  // Keep tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && setIds(load());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isSaved = useCallback((id: string) => ids.includes(id), [ids]);

  /** Adds or removes the product; returns true when it is now saved. */
  const toggle = useCallback(
    (id: string) => {
      const nowSaved = !ids.includes(id);
      setIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [id, ...current].slice(0, MAX_SAVED)));
      return nowSaved;
    },
    [ids],
  );
  const remove = useCallback((id: string) => setIds((current) => current.filter((x) => x !== id)), []);
  const clear = useCallback(() => setIds([]), []);

  const value = useMemo(() => ({ ids, count: ids.length, isSaved, toggle, remove, clear }), [ids, isSaved, toggle, remove, clear]);
  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved(): SavedContextValue {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used inside SavedProvider');
  return ctx;
}
