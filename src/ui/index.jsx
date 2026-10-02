import React from 'react';
import Icon from './Icon.jsx';

export { default as Icon } from './Icon.jsx';

const cx = (...parts) => parts.filter(Boolean).join(' ');
export { cx };

const BUTTON_VARIANTS = {
  primary: 'bg-ink text-white hover:bg-ink-2 border border-ink',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-subtle',
  ghost: 'bg-transparent text-ink-2 border border-transparent hover:bg-black/5',
  danger: 'bg-surface text-act border border-act-line hover:bg-act-soft',
};

const BUTTON_SIZES = {
  sm: 'h-8 px-2.5 text-sm gap-1.5',
  md: 'h-9 px-3.5 text-base gap-2',
  lg: 'h-11 px-5 text-md gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  loading,
  disabled,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} /> : null}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, className, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'grid h-8 w-8 place-items-center rounded text-ink-3 transition-colors hover:bg-black/5 hover:text-ink',
        className
      )}
      {...rest}
    >
      <Icon name={icon} size={17} />
    </button>
  );
}

export function Spinner({ className }) {
  return (
    <span
      className={cx(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className
      )}
      aria-hidden="true"
    />
  );
}

const BADGE_TONES = {
  ok: 'bg-ok-soft text-ok border-ok-line',
  watch: 'bg-watch-soft text-watch border-watch-line',
  act: 'bg-act-soft text-act border-act-line',
  neutral: 'bg-subtle text-ink-2 border-line',
};

export function Badge({ tone = 'neutral', children, dot, className }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-xs font-semibold',
        BADGE_TONES[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusDot({ tone = 'ok', pulse, className }) {
  const color = { ok: 'bg-ok', watch: 'bg-watch', act: 'bg-act', neutral: 'bg-ink-4' }[tone];
  return (
    <span className={cx('relative inline-flex h-2.5 w-2.5', className)}>
      {pulse && <span className={cx('absolute inset-0 animate-ping rounded-full opacity-60', color)} />}
      <span className={cx('relative h-2.5 w-2.5 rounded-full', color)} />
    </span>
  );
}

export function Panel({ title, action, children, className, bodyClassName, flush }) {
  return (
    <section className={cx('panel', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-md font-semibold text-ink">{title}</h2>
          {action}
        </header>
      )}
      <div className={cx(!flush && 'p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageTitle({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.01em] text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-md text-ink-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-sm text-ink-3">{hint}</span>}
      {error && <span className="mt-1 block text-sm text-act">{error}</span>}
    </label>
  );
}

export function Segmented({ options, value, onChange, className }) {
  return (
    <div className={cx('inline-flex rounded border border-line-strong bg-surface p-0.5', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cx(
            'rounded-sm px-3 py-1 text-sm font-semibold transition-colors',
            value === opt.value ? 'bg-ink text-white' : 'text-ink-2 hover:bg-black/5'
          )}
        >
          {opt.label}
          {opt.count != null && (
            <span className={cx('ml-1.5', value === opt.value ? 'text-white/70' : 'text-ink-4')}>
              {opt.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Loading({ label = 'Loading' }) {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-ink-3">
      <Spinner /> {label}…
    </div>
  );
}

export function ErrorNote({ error, children }) {
  const msg =
    children || error?.response?.data?.error || error?.message || 'Something went wrong.';
  return (
    <div className="flex items-start gap-2 rounded border border-act-line bg-act-soft px-3 py-2.5 text-sm text-act">
      <Icon name="warning" size={16} className="mt-0.5 shrink-0" />
      <span>{msg}</span>
    </div>
  );
}

export function Empty({ icon = 'inbox', title, children, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-3 grid h-10 w-10 place-items-center rounded-md bg-subtle text-ink-3">
        <Icon name={icon} size={20} />
      </span>
      <p className="font-semibold text-ink">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-ink-3">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Logo({ size = 28, inverse }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={inverse ? '#fff' : '#111418'} />
      <circle cx="16" cy="16" r="6" fill="none" stroke={inverse ? '#111418' : '#fff'} strokeWidth="3" />
      <circle cx="16" cy="16" r="1.8" fill="#34D399" />
    </svg>
  );
}

export function Avatar({ name, size = 32, className }) {
  const initials = (name || '?')
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  // Stable, muted hue per name so a family list is easy to scan.
  let hash = 0;
  for (const ch of name || '') hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hues = ['#E0E7FF', '#DCFCE7', '#FEF3C7', '#FCE7F3', '#E0F2FE', '#F3E8FF'];
  const fgs = ['#3730A3', '#166534', '#92400E', '#9D174D', '#075985', '#6B21A8'];
  const i = hash % hues.length;
  return (
    <span
      className={cx('grid shrink-0 place-items-center rounded-full font-bold', className)}
      style={{ width: size, height: size, background: hues[i], color: fgs[i], fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
