import { Link } from 'react-router';
import type { Category } from '../../lib/api';
import { formatKES } from '../../lib/format';
import type { CategoryKeywords } from '../../lib/seoKeywords';
import { useSite } from '../../state/site';
import { RevealStack } from '../ui/Reveal';

/**
 * Short, factual text under a category's products, written around what people
 * search for (e.g. "sofa sets in Kenya and their prices"). Uses only live
 * facts: product count, lowest price and the real delivery areas. Helps search
 * engines understand the page and links shoppers to related collections.
 */
export function CategoryIntro({
  category,
  parent,
  subcategories,
  keywords,
  facts,
}: {
  category: Category;
  parent: Category | null;
  subcategories: Category[];
  keywords: CategoryKeywords;
  facts: { count: number; from: number | null };
}) {
  const { zones } = useSite();
  const name = category.name.toLowerCase();
  const areas = zones.map((z) => z.name).join(', ');

  return (
    <section aria-labelledby="category-intro" className="mt-16 border-t border-paper-200 pt-10">
      <div className="max-w-3xl space-y-4 text-sm leading-relaxed text-muted sm:text-base">
        <RevealStack>
        <h2 id="category-intro" className="text-2xl text-navy-800 sm:text-3xl">
          {category.name} in Kenya
        </h2>
        <p>
          {keywords.lead}.{' '}
          {facts.count > 0 && (
            <>
              This collection has {facts.count} {facts.count === 1 ? 'piece' : 'pieces'}
              {facts.from ? <>, with prices from {formatKES(facts.from)}</> : null}. Every price is shown online, so you can compare before you order.
            </>
          )}
        </p>
        <p>
          We deliver across Kenya{areas ? ` (${areas})` : ''}. See{' '}
          <Link to="/delivery" className="text-navy-800 underline underline-offset-4 hover:text-brand-600">
            delivery fees and times
          </Link>
          . Need a different size, fabric or finish? Ask for{' '}
          <Link to="/custom-request" className="text-navy-800 underline underline-offset-4 hover:text-brand-600">
            custom-made {name}
          </Link>{' '}
          from our Nairobi workshop.
        </p>
        {(subcategories.length > 0 || parent) && (
          <p>
            {subcategories.length > 0 ? 'Shop by type: ' : 'More in '}
            {subcategories.length > 0 ? (
              subcategories.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ', '}
                  <Link to={`/category/${c.slug}`} className="text-navy-800 underline underline-offset-4 hover:text-brand-600">
                    {c.name}
                  </Link>
                </span>
              ))
            ) : parent ? (
              <Link to={`/category/${parent.slug}`} className="text-navy-800 underline underline-offset-4 hover:text-brand-600">
                {parent.name}
              </Link>
            ) : null}
            .
          </p>
        )}
        </RevealStack>
      </div>
    </section>
  );
}
