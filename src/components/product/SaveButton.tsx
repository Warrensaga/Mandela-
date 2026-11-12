import { useSaved } from '../../state/saved';
import { Icon } from '../ui/Icon';

/** Heart toggle for saving a product. "icon" sits on product photos; "full" is a labelled button. */
export function SaveButton({ productId, productName, variant = 'icon', className = '' }: {
  productId: string;
  productName: string;
  variant?: 'icon' | 'full';
  className?: string;
}) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(productId);
  const label = saved ? `Remove ${productName} from saved items` : `Save ${productName}`;

  const heart = (
    <Icon
      name="heart"
      className={`h-5 w-5 transition-transform duration-200 ${saved ? 'scale-110 text-terracotta-600' : ''}`}
      fill={saved ? 'currentColor' : 'none'}
    />
  );

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={() => toggle(productId)}
        aria-pressed={saved}
        aria-label={label}
        className={`inline-flex h-12 items-center justify-center gap-2 border border-paper-300 px-4 font-label text-[11px] font-bold tracking-[0.16em] text-navy-800 uppercase transition-colors hover:border-navy-800 ${className}`}
      >
        {heart}
        {saved ? 'Saved' : 'Save'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        // The card's link covers the whole card; keep the click on the heart.
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      aria-pressed={saved}
      aria-label={label}
      className={`relative z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#0a1530] shadow-sm transition-colors hover:bg-white ${className}`}
    >
      {heart}
    </button>
  );
}
