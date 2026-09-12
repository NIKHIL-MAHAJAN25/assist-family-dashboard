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
        'relative overflow-hidden rounded-card bg-surface shadow-card',
        'border',
        emphasis ? 'border-line-sage' : 'border-line',
        interactive
          ? 'transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-sage hover:shadow-lift'
          : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {accent && (
        <span
          aria-hidden="true"
          className={['absolute inset-y-0 left-0 w-1', ACCENTS[accent] || ACCENTS.quiet].join(' ')}
        />
      )}
      <div className={[accent ? 'pl-1' : '', bodyClassName].join(' ')}>{children}</div>
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
