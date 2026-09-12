import React from 'react';

// The card shape is lifted straight from SellerApp's projectitem.xml: a rounded
// surface with a hairline stroke and, for anything that has a *type* or a
// *severity*, a 4px coloured rail running down the left edge. That rail is the
// single motif that makes a list of mixed-type rows scannable without colouring
// the whole card.

const ACCENTS = {
  sage: 'bg-sage',
  ok: 'bg-ok-fg',
  attend: 'bg-attend-fg',
  alert: 'bg-alert-fg',
  info: 'bg-info-fg',
  quiet: 'bg-line-sage',
};

export default function Card({
  accent,
  interactive = false,
  emphasis = false,
  className = '',
  bodyClassName = 'p-5',
  children,
  ...rest
}) {
  return (
    <div
      className={[
        'flex overflow-hidden rounded-card bg-surface shadow-card',
        'border',
        emphasis ? 'border-line-sage' : 'border-line',
        interactive
          ? 'transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-sage hover:shadow-lift'
          : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {/* The rail is a flex child, not an absolutely-positioned overlay. An
          overlay forces the body to carry its own left offset, and expressing
          that as `pl-1` alongside `p-5` silently collapsed the body's left
          padding to 4px — Tailwind resolves `pl-*` over `p-*` by stylesheet
          order rather than adding to it, so the content ended up flush against
          the rail. As a flex child the rail occupies real space and the body
          keeps whatever padding `bodyClassName` asks for, at any value.
          This also matches how companion-app's AssistCard builds the same
          motif (a Row with a 4dp Box), so the two apps stay structurally
          identical on the one thing they most need to share. */}
      {accent && (
        <span
          aria-hidden="true"
          className={['w-1 shrink-0', ACCENTS[accent] || ACCENTS.quiet].join(' ')}
        />
      )}
      <div className={['min-w-0 flex-1', bodyClassName].join(' ')}>{children}</div>
    </div>
  );
}

/** A soft inset panel — form groups, sub-sections, filter bars. */
export function Panel({ className = '', children, ...rest }) {
  return (
    <div
      className={['rounded-card border border-line bg-surface-sunken', className].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Section heading inside a card or panel. */
export function SectionTitle({ children, hint, className = '' }) {
  return (
    <div className={['mb-4', className].join(' ')}>
      <h2 className="font-display text-[19px] font-semibold text-ink">{children}</h2>
      {hint && <p className="mt-1 text-[14px] leading-relaxed text-ink-faint">{hint}</p>}
    </div>
  );
}
