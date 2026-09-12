import React from 'react';
import Icon from './Icon.jsx';

// Pill buttons, matching the SellerApp MaterialButton language (30-40dp corner
// radius, solid sage fill for the primary action, sage-stroked outline for the
// secondary one). Text sits on sage-700 rather than the brand sage so white
// label text clears WCAG AA (5.8:1) — the brand sage itself is reserved for
// strokes, icons and display type where 3.5:1 is fine.

const VARIANTS = {
  primary:
    'bg-sage-700 text-white shadow-card hover:bg-sage-800 active:bg-sage-900 disabled:bg-sage-300',
  secondary:
    'bg-transparent text-sage-800 border border-sage ring-inset hover:bg-sage-100 active:bg-sage-200 disabled:border-line disabled:text-ink-faint',
  soft: 'bg-surface-fill text-ink-soft hover:bg-sage-200 active:bg-sage-300 disabled:text-ink-faint',
  ghost: 'bg-transparent text-ink-soft hover:bg-surface-sunken active:bg-surface-fill',
  danger:
    'bg-transparent text-alert-fg border border-alert-line hover:bg-alert-bg active:bg-alert-line',
};

const SIZES = {
  sm: 'h-9 px-4 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-[15px] gap-2',
  lg: 'h-14 px-7 text-[17px] gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconAfter,
  loading = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        'inline-flex shrink-0 select-none items-center justify-center rounded-pill font-bold',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-150',
        'active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0',
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <Icon name="refresh" size={size === 'sm' ? 15 : 17} className="animate-spin" />
      ) : (
        icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />
      )}
      {children}
      {iconAfter && !loading && <Icon name={iconAfter} size={size === 'sm' ? 15 : 17} />}
    </button>
  );
}

/** Square icon-only button, used for row actions where a label would crowd. */
export function IconButton({ icon, label, variant = 'ghost', size = 'md', className = '', ...rest }) {
  const box = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={[
        'inline-flex items-center justify-center rounded-pill transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        box,
        className,
      ].join(' ')}
      {...rest}
    >
      <Icon name={icon} size={size === 'sm' ? 16 : 18} />
    </button>
  );
}
