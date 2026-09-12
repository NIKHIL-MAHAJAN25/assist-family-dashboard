import React from 'react';

/**
 * The Assist mark: a leaf held inside a rounded tile. Sage on paper, the same
 * two colours the whole system is built from — no gradient, no glow. It reads
 * at 24px in the sidebar and at 72px on the sign-in page without changing.
 */
export function Brandmark({ size = 36, className = '' }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Assist"
    >
      <rect width="48" height="48" rx="14" fill="#698B6A" />
      {/* leaf */}
      <path
        d="M24 10.5c6.2 4.7 9.4 8.8 9.4 14.1A9.4 9.4 0 0 1 24 34a9.4 9.4 0 0 1-9.4-9.4c0-5.3 3.2-9.4 9.4-14.1Z"
        fill="#F9F8F4"
      />
      {/* midrib, left open at the tip so the leaf reads as a shield too */}
      <path
        d="M24 16.5v14.2"
        stroke="#698B6A"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M24 23.6l3.6-3.2M24 27.8l-3.6-3.2"
        stroke="#698B6A"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrandLockup({ subtitle = 'Family dashboard', compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <Brandmark size={compact ? 30 : 38} />
      <div className="min-w-0 leading-none">
        <p className="font-display text-[20px] font-semibold tracking-tight text-ink">Assist</p>
        {!compact && (
          <p className="mt-1 truncate text-[12px] font-bold uppercase tracking-[0.14em] text-ink-faint">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
