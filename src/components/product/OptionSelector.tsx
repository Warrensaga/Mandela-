import { useId } from 'react';
import type { ProductDetail } from '../../lib/api';
import { isSwatchOption, swatchColour, valueState, type Selection } from '../../lib/catalog/variants';

interface OptionSelectorProps {
  product: ProductDetail;
  selection: Selection;
  onSelect: (option: string, value: string) => void;
}

/**
 * One radio group per option. Values that are not offered with the current
 * choices, or are out of stock, stay visible: disabled and explained.
 */
export function OptionSelector({ product, selection, onSelect }: OptionSelectorProps) {
  const baseId = useId();
  return (
    <div className="space-y-5">
      {product.options.map((option) => {
        const labelId = `${baseId}-${option.name}`;
        const selected = selection[option.name];
        const swatches = isSwatchOption(option.name);
        const notes = option.values
          .map((value) => ({ value, state: valueState(product, selection, option.name, value) }))
          .filter((v) => v.value === selected && v.state.kind !== 'available');
        return (
          <div key={option.name} role="radiogroup" aria-labelledby={labelId}>
            <p id={labelId} className="mb-2 text-sm text-muted">
              <span className="font-semibold text-navy-800">{option.name}</span>
              {selected ? `: ${selected}` : ': choose one'}
            </p>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const state = valueState(product, selection, option.name, value);
                const isSelected = selected === value;
                const disabled = state.kind === 'unavailable';
                const outOfStock = state.kind === 'out_of_stock';
                const hex = swatches ? swatchColour(value) : null;
                const reason = state.kind === 'available' ? undefined : state.reason;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-disabled={disabled}
                    aria-label={reason ? `${value}, ${reason.toLowerCase()}` : value}
                    title={reason}
                    onClick={() => !disabled && onSelect(option.name, value)}
                    className={`relative inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
                      isSelected
                        ? 'border-navy-800 bg-navy-800 text-paper-50'
                        : disabled
                          ? 'cursor-not-allowed border-dashed border-paper-300 bg-paper-100 text-muted/70'
                          : 'border-paper-300 bg-paper-50 text-navy-800 hover:border-navy-400'
                    } ${outOfStock && !isSelected ? 'text-muted' : ''}`}
                  >
                    {hex && (
                      <span
                        className="h-4 w-4 rounded-full border border-black/15"
                        style={{ background: hex }}
                        aria-hidden="true"
                      />
                    )}
                    <span className={outOfStock || disabled ? 'line-through decoration-1' : ''}>{value}</span>
                  </button>
                );
              })}
            </div>
            {notes.map((n) => (
              <p key={n.value} className="mt-2 text-xs text-terracotta-600">
                {n.value}: {n.state.kind === 'available' ? '' : n.state.reason}
              </p>
            ))}
          </div>
        );
      })}
      <p className="text-xs text-muted">Crossed-out choices are out of stock or not made in that combination.</p>
    </div>
  );
}
