import { GoogleReviews } from '../components/home/GoogleReviews';
import { HeroCarousel, HeroSkeleton } from '../components/home/HeroCarousel';
import {
  BenefitStrip,
  CustomCta,
  InteriorInspiration,
  OffersFeature,
  ProductShelf,
  PromiseSection,
  ShopByCategory,
  StayInTouch,
} from '../components/home/HomeSections';
import { RecentProjects } from '../components/home/RecentProjects';
import { ShopIntro } from '../components/home/ShopIntro';
import { Seo } from '../components/ui/Seo';
import { useAsync } from '../hooks/useAsync';
import { fetchBestSellerIds, fetchCatalog, fetchHeroSlides } from '../lib/api';
import { pickHomeShelves } from '../lib/catalog/home';
import { storeLd, websiteLd } from '../lib/seo';
import { PAGE_KEYWORDS } from '../lib/seoKeywords';
import { useSite } from '../state/site';

/**
 * Home page, top to bottom: hero, service facts, categories, best sellers
 * (or featured pieces until there are enough real orders), new arrivals,
 * offers, rooms, furnishing projects (once published), how ordering works, Google reviews (or delivery fees),
 * social follow, custom orders and the shop introduction.
 */
export default function HomePage() {
  const { settings } = useSite();
  const slides = useAsync(fetchHeroSlides, []);
  const catalog = useAsync(() => fetchCatalog(), []);
  // A failed ranking must never break the page: fall back to featured pieces.
  const ranking = useAsync(() => fetchBestSellerIds().catch(() => [] as string[]), []);
  const products = catalog.data ?? [];
  const loading = (catalog.loading && !catalog.data) || (ranking.loading && !ranking.data);
  const { bestSellers, featured, newest } = pickHomeShelves(products, ranking.data ?? []);
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
      <ShopByCategory />

      {bestSellers.length > 0 ? (
        <ProductShelf
          id="best-heading"
          tone="grey"
          title="Best sellers"
          intro="Most ordered over the last three months."
          link={{ to: '/shop', label: 'Shop all' }}
          products={bestSellers}
          loading={false}
        />
      ) : (
        <ProductShelf
          id="featured-heading"
          tone="grey"
          title="Featured"
          link={{ to: '/shop', label: 'Shop all' }}
          products={featured}
          loading={loading}
        />
      )}

      <ProductShelf
        id="new-heading"
        title="New arrivals"
        link={{ to: '/shop?sort=newest', label: 'See all new pieces' }}
        products={newest}
        loading={loading}
      />
      {catalog.error && (
        <p className="container-page pb-10 text-sm text-terracotta-600" role="alert">
          {catalog.error.message}
        </p>
      )}

      <OffersFeature products={products} />
      <InteriorInspiration products={products} />
      <RecentProjects />
      <PromiseSection />
      <GoogleReviews />
      <StayInTouch />
      <CustomCta />
      <ShopIntro />
    </>
  );
}
