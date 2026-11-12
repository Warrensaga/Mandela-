import { useEffect, useId, useRef, type ReactNode } from 'react';
import { tone as toneFor, label, type Tone } from '../../lib/admin/labels';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-navy-800">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-ink/8 text-muted',
  info: 'bg-sky-100 text-sky-800',
  success: 'bg-brand-600/12 text-brand-700',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-terracotta-500/12 text-terracotta-600',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]}`}>{children}</span>;
}

export function StatusBadge({ value }: { value: string }) {
  return <Badge tone={toneFor(value)}>{label(value)}</Badge>;
}

export function StockPill({ stock, threshold, madeToOrder }: { stock: number; threshold: number; madeToOrder?: boolean }) {
  if (madeToOrder) return <Badge tone="info">Made to order ({stock})</Badge>;
  if (stock <= 0) return <Badge tone="danger">Out of stock</Badge>;
  if (stock <= threshold) return <Badge tone="warning">Low: {stock}</Badge>;
  return <Badge tone="success">{stock} in stock</Badge>;
}

export function Card({ children, className = '', title, actions }: { children: ReactNode; className?: string; title?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-xl border border-paper-200 bg-white ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-200 px-4 py-3">
          {title && <h2 className="font-sans text-sm font-semibold text-navy-800">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Notice({ kind, children, onDismiss }: { kind: 'success' | 'error' | 'info'; children: ReactNode; onDismiss?: () => void }) {
  const styles = {
    success: 'border-brand-600/30 bg-brand-600/8 text-brand-700',
    error: 'border-terracotta-500/30 bg-terracotta-500/8 text-terracotta-600',
    info: 'border-paper-300 bg-paper-100 text-navy-800',
  }[kind];
  return (
    <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${styles}`} role={kind === 'error' ? 'alert' : 'status'}>
      <div>{children}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="shrink-0 text-xs underline" aria-label="Dismiss">
          Dismiss
        </button>
      )}
    </div>
  );
}

export const inputCls =
  'w-full rounded-lg border border-paper-300 bg-white px-3 py-2 text-sm text-ink focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none disabled:bg-paper-100';

export function Btn({
  children,
  variant = 'primary',
  className = '',
  ...rest
}: { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const v = {
    primary: 'bg-navy-800 text-paper-50 hover:bg-navy-900',
    secondary: 'border border-paper-300 bg-white text-navy-800 hover:bg-paper-100',
    danger: 'border border-terracotta-500/40 bg-white text-terracotta-600 hover:bg-terracotta-500/8',
    ghost: 'text-navy-800 hover:bg-paper-100',
  }[variant];
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function LabeledField({ label: text, hint, children, className = '' }: { label: string; hint?: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-navy-800">
        {text}
      </label>
      {children(id)}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label: text, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-navy-800">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-brand-600" />
      {text}
    </label>
  );
}

/** Centered dialog using the native <dialog> element (focus trap and Escape for free). */
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-xl bg-white p-0 shadow-2xl backdrop:bg-navy-900/40`}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-center justify-between border-b border-paper-200 px-5 py-3">
            <h2 className="font-sans text-base font-semibold text-navy-800">{title}</h2>
            <button type="button" onClick={onClose} className="rounded p-1 text-muted hover:bg-paper-100" aria-label="Close">
              ✕
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-paper-200 px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-paper-300 px-4 py-8 text-center text-sm text-muted">{children}</p>;
}

export function Loading() {
  return (
    <p className="py-10 text-center text-sm text-muted" role="status">
      Loading…
    </p>
  );
}
