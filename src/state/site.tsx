import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_SETTINGS,
  fetchCategoryTree,
  fetchDeliveryZones,
  fetchSettings,
  type CategoryNode,
  type DeliveryZone,
  type SiteSettings,
} from '../lib/api';

interface SiteData {
  settings: SiteSettings;
  categories: CategoryNode[];
  zones: DeliveryZone[];
  ready: boolean;
  error: Error | null;
  /** Looks up a category (top-level or sub-category) by slug, with its parent. */
  findCategory: (slug: string) => { category: CategoryNode | CategoryNode['children'][number]; parent: CategoryNode | null } | null;
  categoryById: (id: string) => { name: string; slug: string } | null;
}

const SiteContext = createContext<SiteData | null>(null);

/** Loads settings, the category tree and delivery zones once for the whole storefront. */
export function SiteProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchSettings(), fetchCategoryTree(), fetchDeliveryZones()])
      .then(([s, c, z]) => {
        if (!active) return;
        setSettings(s);
        setCategories(c);
        setZones(z);
      })
      .catch((e: unknown) => active && setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<SiteData>(() => {
    const findCategory: SiteData['findCategory'] = (slug) => {
      for (const parent of categories) {
        if (parent.slug === slug) return { category: parent, parent: null };
        const child = parent.children.find((c) => c.slug === slug);
        if (child) return { category: child, parent };
      }
      return null;
    };
    const categoryById: SiteData['categoryById'] = (id) => {
      for (const parent of categories) {
        if (parent.id === id) return parent;
        const child = parent.children.find((c) => c.id === id);
        if (child) return child;
      }
      return null;
    };
    return { settings, categories, zones, ready, error, findCategory, categoryById };
  }, [settings, categories, zones, ready, error]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteData {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside <SiteProvider>');
  return ctx;
}
