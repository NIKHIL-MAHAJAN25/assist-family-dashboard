import React from 'react';
import Icon from './Icon.jsx';

/**
 * Loading, error and empty states. All three are card-shaped and the same
 * height class as the real content they stand in for, so the page doesn't
 * jump when data arrives.
 */

export function Skeleton({ className = '' }) {
  return (
    <div
      className={['animate-breathe rounded-pill bg-surface-fill', className].join(' ')}
      aria-hidden="true"
    />
  );
}

/** Ghost card matching the shape of a log-entry row. */
export function LoadingBanner({ label = 'Loading…', rows = 3 }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-card border border-line bg-surface p-5 shadow-card"
          style={{ animationDelay: `${i * 140}ms` }}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="ml-auto h-4 w-28" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorBanner({ error, label = 'Something went wrong' }) {
  const detail = error?.response?.data?.message || error?.message || 'Unknown error';
  return (
    <div
      role="alert"
      className="flex items-start gap-3.5 rounded-card border border-alert-line bg-alert-bg px-5 py-4"
    >
      <span className="mt-0.5 shrink-0 text-alert-fg">
        <Icon name="warning" size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-bold text-alert-fg">{label}</p>
        <p className="mt-0.5 break-words text-[14px] leading-relaxed text-alert-fg/85">{detail}</p>
      </div>
    </div>
  );
}

export function EmptyState({
  label = 'Nothing here yet.',
  hint,
  icon = 'inbox',
  action,
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line-sage bg-sage-50/60 px-6 py-14 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-pill bg-surface text-sage shadow-card">
        <Icon name={icon} size={24} />
      </span>
      <p className="font-display text-[19px] font-semibold text-ink">{label}</p>
      {hint && <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-ink-faint">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
