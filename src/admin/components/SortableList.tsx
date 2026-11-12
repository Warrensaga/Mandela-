import { useState, type ReactNode } from 'react';

interface SortableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  onReorder: (items: T[]) => void;
  renderItem: (item: T) => ReactNode;
  disabled?: boolean;
}

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

/**
 * Drag to reorder (mouse), with up/down buttons for keyboard and touch users.
 * Calls onReorder with the new order; the caller saves it.
 */
export function SortableList<T>({ items, getId, getLabel, onReorder, renderItem, disabled }: SortableListProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <ul className="divide-y divide-paper-200 rounded-lg border border-paper-200 bg-white">
      {items.map((item, i) => (
        <li
          key={getId(item)}
          draggable={!disabled}
          onDragStart={(e) => {
            setDragIndex(i);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setOverIndex(i);
          }}
          onDragEnd={() => {
            setDragIndex(null);
            setOverIndex(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIndex !== null && dragIndex !== i) onReorder(move(items, dragIndex, i));
            setDragIndex(null);
            setOverIndex(null);
          }}
          className={`flex items-center gap-3 px-3 py-2.5 ${overIndex === i && dragIndex !== null && dragIndex !== i ? 'bg-paper-100' : ''} ${dragIndex === i ? 'opacity-50' : ''}`}
        >
          <span className={`select-none text-muted ${disabled ? 'opacity-30' : 'cursor-grab'}`} aria-hidden="true" title="Drag to reorder">
            ⠿
          </span>
          <div className="min-w-0 flex-1">{renderItem(item)}</div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              disabled={disabled || i === 0}
              onClick={() => onReorder(move(items, i, i - 1))}
              className="rounded px-1.5 py-1 text-xs text-navy-800 hover:bg-paper-100 disabled:opacity-30"
              aria-label={`Move ${getLabel(item)} up`}
            >
              ↑
            </button>
            <button
              type="button"
              disabled={disabled || i === items.length - 1}
              onClick={() => onReorder(move(items, i, i + 1))}
              className="rounded px-1.5 py-1 text-xs text-navy-800 hover:bg-paper-100 disabled:opacity-30"
              aria-label={`Move ${getLabel(item)} down`}
            >
              ↓
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
