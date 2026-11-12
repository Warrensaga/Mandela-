import type { ProductSummary } from '../../lib/api';
import { Reveal } from '../ui/Reveal';
import { ProductCard } from './ProductCard';

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductSummary[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <Reveal as="li" key={p.id} delay={Math.min(i % 4, 3) * 0.05}>
          <ProductCard product={p} priority={i < priorityCount} />
        </Reveal>
      ))}
    </ul>
  );
}
