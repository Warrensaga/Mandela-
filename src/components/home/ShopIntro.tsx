import { Link } from 'react-router';
import { useSite } from '../../state/site';

/**
 * Plain-language "who we are" text for search engines and shoppers, built
 * around the searches "furniture shop in Nairobi", "furniture shops in Nairobi
 * with prices" and "custom made furniture Nairobi". Facts only: the
 * categories, address and delivery areas come from the live settings.
 */
export function ShopIntro() {
  const { settings, categories, zones } = useSite();
  const address = settings.contact.address;
  const areas = zones.map((z) => z.name).join(', ');

  return (
    <section aria-labelledby="shop-intro-heading" className="bg-paper-50 py-16 sm:py-20">
      <div className="container-page max-w-4xl space-y-4 text-sm leading-relaxed text-muted sm:text-base">
        <h2 id="shop-intro-heading" className="text-2xl text-navy-800 sm:text-3xl">
          A furniture shop in Nairobi, with prices online
        </h2>
        <p>
          {settings.storeName} makes and sells furniture for Kenyan homes and offices: sofa sets and L-shaped sofas, beds and wardrobes,
          dining tables and chairs, mattresses and office furniture. Every piece has its price shown online, so you can compare before you
          order, then confirm on WhatsApp and pay by M-Pesa or bank transfer.
        </p>
        <p>
          Need something that fits your space exactly? We also take{' '}
          <Link to="/custom-request" className="text-navy-800 underline underline-offset-4 hover:text-brand-600">
            custom made furniture
          </Link>{' '}
          orders in your size, fabric and finish. We deliver across Kenya{areas ? ` (${areas})` : ''}; see{' '}
          <Link to="/delivery" className="text-navy-800 underline underline-offset-4 hover:text-brand-600">
            delivery fees and times
          </Link>
          .{' '}
          {address && (
            <>
              Visit our{' '}
              <Link to="/contact" className="text-navy-800 underline underline-offset-4 hover:text-brand-600">
                showroom on {address}
              </Link>
              .
            </>
          )}
        </p>
        {categories.length > 0 && (
          <p>
            Shop by room:{' '}
            {categories.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ', '}
                <Link to={`/category/${c.slug}`} className="text-navy-800 underline underline-offset-4 hover:text-brand-600">
                  {c.name}
                </Link>
              </span>
            ))}
            .
          </p>
        )}
      </div>
    </section>
  );
}
