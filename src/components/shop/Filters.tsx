import type { ReactNode } from 'react';
import type { Facets, ShopFilters } from '../../lib/catalog/filters';
import { swatchColour } from '../../lib/catalog/variants';
import { formatKES } from '../../lib/format';
import { useSite } from '../../state/site';

interface FiltersProps {
  filters: ShopFilters;
  facets: Facets;
  onChange: (patch: Partial<ShopFilters>) => void;
  onClear: () => void;
  showCategory: boolean;
}

const PRICE_BANDS: { label: string; min: number | null; max: number | null }[] = [
  { label: `Under ${formatKES(10000)}`, min: null, max: 10000 },
  { label: `${formatKES(10000)} to ${formatKES(25000)}`, min: 10000, max: 25000 },
  { label: `${formatKES(25000)} to ${formatKES(50000)}`, min: 25000, max: 50000 },
  { label: `${formatKES(50000)} to ${formatKES(100000)}`, min: 50000, max: 100000 },
  { label: `Over ${formatKES(100000)}`, min: 100000, max: null },
];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-paper-200 py-5 first:pt-0">
      <legend className="mb-3 text-sm font-semibold text-navy-800">{title}</legend>
      {children}
    </fieldset>
  );
}

function Chip({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active ? 'border-navy-800 bg-navy-800 text-paper-50' : 'border-paper-300 bg-paper-50 text-navy-800 hover:border-navy-400'
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5 text-sm text-navy-800">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 rounded border-paper-300 accent-brand-600"
      />
    </label>
  );
}

export function Filters({ filters, facets, onChange, onClear, showCategory }: FiltersProps) {
  const { categories } = useSite();
  const bandActive = (b: (typeof PRICE_BANDS)[number]) => filters.minPrice === b.min && filters.maxPrice === b.max;

  return (
    <div>
      {showCategory && (
        <Group title="Category">
          <label htmlFor="filter-category" className="sr-only">
            Category
          </label>
          <select
            id="filter-category"
            className="input"
            value={filters.category ?? ''}
            onChange={(e) => onChange({ category: e.target.value || null })}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <optgroup key={c.id} label={c.name}>
                <option value={c.slug}>All {c.name}</option>
                {c.children.map((child) => (
                  <option key={child.id} value={child.slug}>
                    {child.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Group>
      )}

      {facets.rooms.length > 0 && (
        <Group title="Room">
          <div className="flex flex-wrap gap-2">
            {facets.rooms.map((room) => (
              <Chip key={room} active={filters.room === room} onClick={() => onChange({ room: filters.room === room ? null : room })}>
                {room}
              </Chip>
            ))}
          </div>
        </Group>
      )}

      <Group title="Price">
        <div className="flex flex-wrap gap-2">
          {PRICE_BANDS.map((b) => (
            <Chip
              key={b.label}
              active={bandActive(b)}
              onClick={() => onChange(bandActive(b) ? { minPrice: null, maxPrice: null } : { minPrice: b.min, maxPrice: b.max })}
            >
              {b.label}
            </Chip>
          ))}
        </div>
      </Group>

      {facets.materials.length > 0 && (
        <Group title="Material">
          <div className="flex flex-wrap gap-2">
            {facets.materials.map((m) => (
              <Chip key={m} active={filters.material === m} onClick={() => onChange({ material: filters.material === m ? null : m })}>
                {m}
              </Chip>
            ))}
          </div>
        </Group>
      )}

      {facets.colours.length > 0 && (
        <Group title="Colour and finish">
          <div className="flex flex-wrap gap-2">
            {facets.colours.map((c) => {
              const hex = swatchColour(c);
              return (
                <Chip key={c} active={filters.colour === c} onClick={() => onChange({ colour: filters.colour === c ? null : c })}>
                  {hex && <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: hex }} aria-hidden="true" />}
                  {c}
                </Chip>
              );
            })}
          </div>
        </Group>
      )}

      <Group title="Availability and delivery">
        <Toggle label="On offer" checked={filters.offers} onChange={(v) => onChange({ offers: v })} />
        <Toggle label="In stock only" checked={filters.inStock} onChange={(v) => onChange({ inStock: v })} />
        <Toggle label="Free delivery" checked={filters.freeDelivery} onChange={(v) => onChange({ freeDelivery: v })} />
        <Toggle label="Made to order" checked={filters.madeToOrder} onChange={(v) => onChange({ madeToOrder: v })} />
      </Group>

      <button type="button" onClick={onClear} className="mt-4 text-sm font-medium text-navy-800 underline underline-offset-4">
        Clear all filters
      </button>
    </div>
  );
}
