import { formatKES } from '../../lib/format';

interface PriceProps {
  amount: number;
  compareAt?: number | null;
  /** Show "From" (variant products whose prices differ). */
  from?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl' };

export function Price({ amount, compareAt, from = false, size = 'md', className = '' }: PriceProps) {
  const onSale = compareAt != null && compareAt > amount;
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className={`font-semibold ${onSale ? 'text-terracotta-600' : 'text-navy-800'} ${sizes[size]}`}>
        {from && <span className="font-normal text-muted">From </span>}
        {formatKES(amount)}
      </span>
      {onSale && (
        <span className={`text-muted line-through ${size === 'lg' ? 'text-base' : 'text-sm'}`}>
          <span className="sr-only">Was </span>
          {formatKES(compareAt)}
        </span>
      )}
    </p>
  );
}
