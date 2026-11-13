import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'whatsapp';
type Size = 'sm' | 'md' | 'lg';

// Square, uppercase buttons in the label font. On `theme-dark` sections the
// primary button flips to a light fill automatically.
const base =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-none font-label font-semibold uppercase tracking-[0.12em] transition-[background-color,color,border-color,transform] duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] select-none';

const variants: Record<Variant, string> = {
  primary: 'bg-navy-800 text-paper-50 hover:bg-navy-600',
  secondary: 'bg-brand-600 text-on-brand hover:bg-brand-700',
  outline: 'border border-navy-800/30 text-navy-800 hover:border-navy-800 hover:bg-navy-800 hover:text-paper-50',
  ghost: 'text-navy-800 hover:bg-navy-50',
  whatsapp: 'bg-[#1f7a4d] text-white hover:bg-[#186440]',
};

const sizes: Record<Size, string> = {
  sm: 'h-10 px-4 text-[11px]',
  md: 'h-12 px-6 text-xs',
  lg: 'h-14 px-8 text-xs',
};

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', extra = ''): string {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

interface CommonProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}

export const Button = forwardRef<HTMLButtonElement, CommonProps & ButtonHTMLAttributes<HTMLButtonElement>>(
  function Button({ variant, size, className = '', type = 'button', ...rest }, ref) {
    return <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...rest} />;
  },
);

export function ButtonLink({ variant, size, className = '', ...rest }: CommonProps & LinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}

export function ButtonAnchor({
  variant,
  size,
  className = '',
  ...rest
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={buttonClasses(variant, size, className)} {...rest} />;
}
