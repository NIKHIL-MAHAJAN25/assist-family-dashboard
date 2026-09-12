import React from 'react';

// Status pills. Every tone stays inside the warm palette — a caregiver looking
// at this all day shouldn't be shouted at in pure red, and the research on
// alert fatigue is blunt about what happens when everything is urgent.

const TONES = {
  neutral: 'bg-surface-fill text-ink-soft border-transparent',
  sage: 'bg-sage-100 text-sage-800 border-sage-200',
  ok: 'bg-ok-bg text-ok-fg border-ok-line',
  attend: 'bg-attend-bg text-attend-fg border-attend-line',
  alert: 'bg-alert-bg text-alert-fg border-alert-line',
  info: 'bg-info-bg text-info-fg border-info-line',
};

export default function Chip({ tone = 'neutral', dot = false, className = '', children, ...rest }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1',
        'text-[12.5px] font-bold leading-none',
        TONES[tone] || TONES.neutral,
        className,
      ].join(' ')}
      {...rest}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-pill bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Toggleable filter chip (SellerApp's ChipGroup, single-select). */
export function FilterChip({ active = false, className = '', children, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={[
        'inline-flex h-9 items-center rounded-pill border px-4 text-[13.5px] font-bold',
        'transition-colors duration-150',
        active
          ? 'border-sage bg-sage text-white shadow-card'
          : 'border-transparent bg-surface-fill text-ink-soft hover:bg-sage-200',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
