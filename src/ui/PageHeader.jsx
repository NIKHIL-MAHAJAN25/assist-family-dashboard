import React from 'react';

/**
 * Every screen opens the same way: a small sage eyebrow, a Fraunces title, an
 * optional sentence of plain-language context, and right-aligned actions.
 * The eyebrow does real work — it's what tells a caregiver at a glance which
 * of six near-identical-looking list screens they're on.
 */
export default function PageHeader({ eyebrow, title, description, actions, className = '' }) {
  return (
    <header
      className={[
        'mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4',
        className,
      ].join(' ')}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-sage-700">
            <span className="h-px w-6 bg-sage-300" aria-hidden="true" />
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[34px] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[40px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-ink-faint">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}
