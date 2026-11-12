import { GoogleReviews } from '../components/home/GoogleReviews';
import { HeroCarousel, HeroSkeleton } from '../components/home/HeroCarousel';
import { ShopIntro } from '../components/home/ShopIntro';
import {
  BenefitStrip,
  CustomCta,
  DealsStrip,
  FeatureSplits,
  PromiseSection,
  ShopByCategory,
  ShopByRoom,
} from '../components/home/HomeSections';
import { ProductGrid } from '../components/product/ProductGrid';
import { ButtonLink } from '../components/ui/Button';
import { Seo } from '../components/ui/Seo';
import { GridSkeleton } from '../components/ui/Skeleton';
import { useAsync } from '../hooks/useAsync';
import { fetchCatalog, fetchHeroSlides } from '../lib/api';
import { isAvailable, sortProducts } from '../lib/catalog/filters';
import { storeLd, websiteLd } from '../lib/seo';
import { PAGE_KEYWORDS } from '../lib/seoKeywords';
import { useSite } from '../state/site';

export default function HomePage() {
  const { settings } = useSite();
  const slides = useAsync(fetchHeroSlides, []);
  const catalog = useAsync(() => fetchCatalog(), []);
  const products = catalog.data ?? [];
  const newest = sortProducts(products.filter(isAvailable), 'newest').slice(0, 4);
  const shown = new Set(newest.map((p) => p.id));
  const featured = sortProducts(
    products.filter((p) => p.isFeatured && !shown.has(p.id)),
    'featured',
  ).slice(0, 8);

  return (
    <>
      <Seo
        path="/"
        absoluteTitle={PAGE_KEYWORDS.home.title}
        description={PAGE_KEYWORDS.home.description}
        jsonLd={[storeLd(settings), websiteLd(settings)]}
      />
      <h1 className="sr-only">{settings.storeName}: furniture shop in Nairobi, Kenya</h1>

      {slides.loading && !slides.data ? <HeroSkeleton /> : <HeroCarousel slides={slides.data ?? []} />}
      <BenefitStrip />
      <DealsStrip products={products} />
      <ShopByCategory />

      <section aria-labelledby="new-heading" className="bg-paper-50 py-20 sm:py-24">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow eyebrow-line">Just in</p>
              <h2 id="new-heading" className="mt-3 text-4xl sm:text-5xl">
                New arrivals
              </h2>
            </div>
            <ButtonLink to="/shop?sort=newest" variant="outline" size="md">
              View more <span aria-hidden="true">↗</span>
            </ButtonLink>
          </div>
          <div className="mt-10">{catalog.loading && !catalog.data ? <GridSkeleton count={4} /> : <ProductGrid products={newest} />}</div>
        </div>
      </section>

      <FeatureSplits products={products} />

      {(featured.length > 0 || (catalog.loading && !catalog.data)) && (
        <section aria-labelledby="featured-heading" className="border-t border-paper-200 bg-paper-50 py-20 sm:py-24">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow eyebrow-line">Featured</p>
                <h2 id="featured-heading" className="mt-3 text-4xl sm:text-5xl">
                  Pieces we love right now
                </h2>
              </div>
              <ButtonLink to="/shop" variant="outline" size="md">
                Shop all <span aria-hidden="true">↗</span>
              </ButtonLink>
            </div>
            <div className="mt-10">
              {catalog.loading && !catalog.data ? <GridSkeleton count={4} /> : <ProductGrid products={featured} />}
              {catalog.error && <p className="text-sm text-terracotta-600">{catalog.error.message}</p>}
            </div>
          </div>
        </section>
      )}

      <ShopByRoom products={products} />
      <PromiseSection />
      <GoogleReviews />
      <ShopIntro />
      <CustomCta />
    </>
  );
}
