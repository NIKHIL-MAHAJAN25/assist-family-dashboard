import React, { useId } from 'react';

// Label + pill control + hint/error, so no screen has to re-assemble that
// three-part stack by hand. The pill fill (surface-fill) and the 999px radius
// come from SellerApp's TextInputLayout styling.

function Shell({ label, hint, error, htmlFor, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="av-label">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-[13px] font-bold text-alert-fg">{error}</p>
      ) : (
        hint && <p className="av-hint">{hint}</p>
      )}
    </div>
  );
}

export function Field({ label, hint, error, className, mono = false, ...rest }) {
  const id = useId();
  return (
    <Shell label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <input
        id={id}
        className={['av-input', mono ? 'font-mono text-[13.5px] tracking-tight' : ''].join(' ')}
        aria-invalid={error ? 'true' : undefined}
        {...rest}
      />
    </Shell>
  );
}

export function SelectField({ label, hint, error, className, children, ...rest }) {
  const id = useId();
  return (
    <Shell label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <select id={id} className="av-select" {...rest}>
        {children}
      </select>
    </Shell>
  );
}

/**
 * File picker. The native control is unstyleable in any way that matches the
 * rest of this system, so it's hidden behind a dashed drop-plate that reports
 * the chosen filename.
 */
export function FileField({ label, hint, error, className, fileName, ...rest }) {
  const id = useId();
  return (
    <Shell label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <label
        htmlFor={id}
        className="flex cursor-pointer items-center gap-3 rounded-card border border-dashed border-line-sage bg-sage-50 px-5 py-4 transition-colors duration-150 hover:border-sage hover:bg-sage-100"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-surface text-sage-700 shadow-card">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3.8" y="5" width="16.4" height="14" rx="3" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="m4.5 17 4.3-4.3a1.8 1.8 0 0 1 2.5 0l4.2 4.2" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-bold text-ink">
            {fileName || 'Choose a photo'}
          </span>
          <span className="block text-[13px] text-ink-faint">
            {fileName ? 'Tap to pick a different one' : 'JPG or PNG, face clearly visible'}
          </span>
        </span>
        <input id={id} type="file" className="sr-only" {...rest} />
      </label>
    </Shell>
  );
}

/** Checkbox styled as a sage pill toggle rather than a native square. */
export function CheckPill({ checked, onChange, disabled, icon, children }) {
  return (
    <label
      className={[
        'inline-flex cursor-pointer select-none items-center gap-2 rounded-pill border px-3.5 h-9 text-[13px] font-bold',
        'transition-colors duration-150',
        checked
          ? 'border-sage bg-sage-100 text-sage-800'
          : 'border-line bg-surface text-ink-faint hover:border-line-sage hover:bg-surface-sunken',
        disabled ? 'cursor-not-allowed opacity-55' : '',
      ].join(' ')}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      {icon}
      {children}
    </label>
  );
}
