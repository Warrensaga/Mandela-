import { useSearchParams } from 'react-router';
import { PageBand } from '../components/layout/PageBand';
import { ShopView } from '../components/shop/ShopView';
import { Seo } from '../components/ui/Seo';
import { useAsync } from '../hooks/useAsync';
import { fetchCatalog } from '../lib/api';

export default function ShopPage() {
  const [params] = useSearchParams();
  const offers = params.get('offers') === '1';
  const catalog = useAsync(() => fetchCatalog(), []);
  const count = catalog.data?.length;

  return (
    <div className="theme-dark">
      <Seo
        title={offers ? 'Furniture offers and deals' : 'Shop all furniture'}
        description="Shop sofas, beds, dining sets and more online in Kenya. Crafted in Nairobi and delivered across Kenya. Filter by room, material, colour and price."
        path="/shop"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/shop' },
        ]}
      />
      <PageBand
        eyebrow={offers ? 'Offers' : 'The shop'}
        title={offers ? 'Pieces on offer' : 'All furniture'}
        description="Sofas, beds, dining and more, crafted in Nairobi and delivered across Kenya."
        crumbs={[{ to: '/', label: 'Home' }, { label: offers ? 'Offers' : 'Shop' }]}
        aside={
          count !== undefined && (
            <p className="text-right">
              <span className="block font-serif text-5xl text-navy-800">{count}</span>
              <span className="label-mono text-muted">pieces</span>
            </p>
          )
        }
      />
      <div className="container-page pb-16">
        <ShopView />
      </div>
    </div>
  );
}
