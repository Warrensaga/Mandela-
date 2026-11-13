import { Link } from 'react-router';
import { formatKES } from '../../lib/format';
import { lineKey, useCart, type CartLine } from '../../state/cart';
import { Icon } from '../ui/Icon';
import { Img } from '../ui/Img';
import { QuantityInput } from '../ui/QuantityInput';

interface CartLinesProps {
  compact?: boolean;
  onNavigate?: () => void;
  /** Keys of lines whose price or availability just changed. */
  flagged?: Set<string>;
}

function lineProblem(line: CartLine): string | null {
  if (line.maxQuantity <= 0) return 'No longer available. Please remove it.';
  if (line.quantity > line.maxQuantity) return `Only ${line.maxQuantity} left. Please reduce the quantity.`;
  return null;
}

export function CartLines({ compact = false, onNavigate, flagged }: CartLinesProps) {
  const { lines, setQuantity, remove } = useCart();
  return (
    <ul className="divide-y divide-paper-200">
      {lines.map((line) => {
        const key = lineKey(line);
        const problem = lineProblem(line);
        return (
          <li key={key} className="flex gap-4 py-4">
            <Link
              to={`/product/${line.slug}`}
              onClick={onNavigate}
              className={`shrink-0 overflow-hidden bg-paper-200 ${compact ? 'h-20 w-20' : 'h-20 w-20 min-[360px]:h-24 min-[360px]:w-24 sm:h-28 sm:w-28'}`}
            >
              <Img src={line.imageUrl} alt={line.name} sizes="112px" className="h-full w-full object-cover" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/product/${line.slug}`} onClick={onNavigate} className="font-medium text-navy-800 hover:underline">
                    {line.name}
                  </Link>
                  {line.variantLabel && <p className="mt-0.5 text-sm text-muted">{line.variantLabel}</p>}
                  {line.madeToOrder && <p className="mt-0.5 text-xs text-navy-600">Made to order</p>}
                </div>
                <p className="shrink-0 text-sm font-semibold whitespace-nowrap text-navy-800">{formatKES(line.unitPrice * line.quantity)}</p>
              </div>
              {flagged?.has(key) && !problem && (
                <p className="mt-1 text-xs text-terracotta-600">Price updated to the current price.</p>
              )}
              {problem && (
                <p className="mt-1 text-xs font-medium text-terracotta-600" role="alert">
                  {problem}
                </p>
              )}
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                <QuantityInput
                  size="sm"
                  value={line.quantity}
                  max={Math.max(line.maxQuantity, 1)}
                  onChange={(q) => setQuantity(key, q)}
                  label={`Quantity of ${line.name}`}
                />
                <button
                  type="button"
                  onClick={() => remove(key)}
                  className="inline-flex min-h-11 items-center gap-1 px-3 text-xs text-muted hover:bg-paper-100 hover:text-navy-800"
                  aria-label={`Remove ${line.name}`}
                >
                  <Icon name="trash" className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function cartHasProblems(lines: CartLine[]): boolean {
  return lines.some((l) => lineProblem(l) !== null);
}
