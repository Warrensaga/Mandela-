import type { StockState } from '../../lib/catalog/variants';

const styles: Record<StockState['kind'], string> = {
  in_stock: 'bg-brand-600/10 text-brand-700',
  low: 'bg-terracotta-500/10 text-terracotta-600',
  out: 'bg-ink/8 text-muted',
  made_to_order: 'bg-navy-100 text-navy-800',
};

const dots: Record<StockState['kind'], string> = {
  in_stock: 'bg-brand-600',
  low: 'bg-terracotta-500',
  out: 'bg-muted',
  made_to_order: 'bg-navy-600',
};

export function StockBadge({ state, className = '' }: { state: StockState; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles[state.kind]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dots[state.kind]}`} aria-hidden="true" />
      {state.label}
    </span>
  );
}
