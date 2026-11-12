import { Icon } from './Icon';

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  label?: string;
  size?: 'sm' | 'md';
}

export function QuantityInput({ value, onChange, min = 1, max, label = 'Quantity', size = 'md' }: QuantityInputProps) {
  const h = size === 'sm' ? 'h-10' : 'h-11';
  const clamp = (n: number) => Math.max(min, Math.min(max, Number.isFinite(n) ? Math.round(n) : min));
  return (
    <div className={`inline-flex ${h} items-center rounded-full border border-paper-300 bg-paper-50`} role="group" aria-label={label}>
      <button
        type="button"
        className={`${h} w-10 rounded-l-full text-navy-800 hover:bg-paper-100 disabled:opacity-40`}
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <Icon name="minus" className="mx-auto h-4 w-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        className="h-full w-10 [appearance:textfield] bg-transparent text-center text-sm font-medium focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
        value={value}
        min={min}
        max={max}
        aria-label={label}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
      />
      <button
        type="button"
        className={`${h} w-10 rounded-r-full text-navy-800 hover:bg-paper-100 disabled:opacity-40`}
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Icon name="plus" className="mx-auto h-4 w-4" />
      </button>
    </div>
  );
}
