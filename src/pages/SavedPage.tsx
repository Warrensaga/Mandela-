import { useMemo } from 'react';
import { PageBand } from '../components/layout/PageBand';
import { ProductGrid } from '../components/product/ProductGrid';
import { Button, ButtonAnchor, ButtonLink } from '../components/ui/Button';
import { WhatsAppIcon } from '../components/ui/Icon';
import { Seo } from '../components/ui/Seo';
import { GridSkeleton } from '../components/ui/Skeleton';
import { useAsync } from '../hooks/useAsync';
import { fetchCatalog } from '../lib/api';
import { savedListMessage, whatsappLink } from '../lib/whatsapp';
import { absUrl } from '../lib/seo';
import { useSaved } from '../state/saved';
import { useSite } from '../state/site';

export default function SavedPage() {
  const { settings } = useSite();
  const saved = useSaved();
  const catalog = useAsync(() => fetchCatalog(), []);

  // Saved order (newest first), live data only: hidden or deleted products drop out.
  const products = useMemo(() => {
    const byId = new Map((catalog.data ?? []).map((p) => [p.id, p]));
    return saved.ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [catalog.data, saved.ids]);

  const message = savedListMessage(products.map((p) => ({ name: p.name, price: p.minPrice, from: p.hasVariants && p.minPrice !== p.maxPrice, url: absUrl(`/product/${p.slug}`) })));

  return (
    <>
      <Seo title="Saved items" noindex />
      <PageBand
        tone="light"
        eyebrow="Your list"
        title="Saved items"
        description="Pieces you have saved on this phone or computer. Send the list to us on WhatsApp for prices, availability or a quote."
        crumbs={[{ to: '/', label: 'Home' }, { label: 'Saved items' }]}
      />
      <div className="container-page py-10 sm:py-14">
        {catalog.loading && !catalog.data ? (
          <GridSkeleton count={4} />
        ) : products.length === 0 ? (
          <div className="card px-6 py-16 text-center">
            <p className="font-serif text-2xl text-navy-800">Nothing saved yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">Tap the heart on any piece to keep it here while you compare.</p>
            <ButtonLink to="/shop" className="mt-6">
              Browse the shop
            </ButtonLink>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-center gap-3">
              {settings.whatsappNumber && (
                <ButtonAnchor variant="whatsapp" size="md" href={whatsappLink(settings.whatsappNumber, message)} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="h-4 w-4" /> Send my list on WhatsApp
                </ButtonAnchor>
              )}
              <Button
                variant="outline"
                size="md"
                onClick={() => window.confirm('Remove all saved items from this device?') && saved.clear()}
              >
                Clear list
              </Button>
              <p className="text-sm text-muted">
                {products.length} {products.length === 1 ? 'piece' : 'pieces'}
              </p>
            </div>
            <ProductGrid products={products} />
          </>
        )}
      </div>
    </>
  );
}
