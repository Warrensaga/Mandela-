import { CategoryTile } from '../components/home/HomeSections';
import { PageBand } from '../components/layout/PageBand';
import { ButtonLink } from '../components/ui/Button';
import { Reveal } from '../components/ui/Reveal';
import { Seo } from '../components/ui/Seo';
import { PAGE_KEYWORDS } from '../lib/seoKeywords';
import { Skeleton } from '../components/ui/Skeleton';
import { useSite } from '../state/site';

/** "Our collections": every top-level category as a photo tile. */
export default function CollectionsPage() {
  const { categories, ready } = useSite();
  return (
    <div>
      <Seo
        title={PAGE_KEYWORDS.collections.title}
        description={PAGE_KEYWORDS.collections.description}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Collections', path: '/categories' },
        ]}
      />
      <PageBand
        title="All categories"
        description="Sofas, beds, dining, office and outdoor furniture, made in our Nairobi workshop."
        crumbs={[{ to: '/', label: 'Home' }, { label: 'Collections' }]}
        aside={
          <div className="flex gap-3">
            <ButtonLink to="/shop" size="md">Shop all</ButtonLink>
            <ButtonLink to="/shop?offers=1" variant="outline" size="md">Offers</ButtonLink>
          </div>
        }
      />
      <div className="container-page pb-20">
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {!ready && Array.from({ length: 6 }, (_, i) => <li key={i}><Skeleton className="aspect-[3/4] w-full rounded-none" /></li>)}
          {categories.map((cat, i) => (
            <Reveal as="li" key={cat.id} delay={(i % 3) * 0.06}>
              <CategoryTile cat={cat} tall />
            </Reveal>
          ))}
        </ul>
      </div>
    </div>
  );
}
