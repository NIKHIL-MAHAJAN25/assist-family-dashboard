import React, { useRef } from 'react';
import { Icon, cx } from '../ui';

const DAY_MS = 86400000;

function relative(date, today) {
  const d = Math.round((today.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / DAY_MS);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  if (d < 14) return 'Last week';
  return `${Math.round(d / 7)} weeks ago`;
}

/**
 * One glass pill instead of a raw <input type="date">: arrows step a day, the middle opens the
 * browser's calendar (the native input stays underneath, invisible, so keyboard and a11y still work).
 */
export default function DayPicker({ value, max, onChange, onStep, onToday }) {
  const input = useRef(null);
  const date = new Date(`${value}T00:00`);
  const atMax = value >= max;

  const open = () => {
    try {
      input.current?.showPicker();
    } catch {
      input.current?.focus();
    }
  };

  const arrow = 'grid h-9 w-9 place-items-center rounded-full text-ink-3 transition hover:bg-black/[0.05] hover:text-ink disabled:pointer-events-none disabled:opacity-25';

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5 rounded-full border border-white/60 bg-surface/80 p-1 shadow-card backdrop-blur-xl">
        <button type="button" aria-label="Previous day" className={arrow} onClick={() => onStep(-1)}>
          <Icon name="chevronLeft" size={17} strokeWidth={2.2} />
        </button>

        <button
          type="button"
          onClick={open}
          className="group relative flex items-center gap-2.5 rounded-full px-3 py-1 text-left transition hover:bg-black/[0.04]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white shadow-sm">
            <span className="text-[13px] font-bold leading-none tabular-nums">{date.getDate()}</span>
          </span>
          <span className="leading-tight">
            <span className="block text-[13px] font-semibold text-ink">
              {date.toLocaleDateString(undefined, { weekday: 'long' })}
            </span>
            <span className="block text-[11px] font-medium text-ink-4">
              {date.toLocaleDateString(undefined, { month: 'long', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })}
              {' · '}
              {relative(date, new Date())}
            </span>
          </span>
          <Icon name="calendar" size={15} className="ml-1 text-ink-4 transition group-hover:text-ink-2" />
          <input
            ref={input}
            type="date"
            tabIndex={-1}
            aria-label="Pick a day"
            value={value}
            max={max}
            onChange={(e) => e.target.value && onChange(e.target.value)}
            className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
          />
        </button>

        <button type="button" aria-label="Next day" className={arrow} onClick={() => onStep(1)} disabled={atMax}>
          <Icon name="chevronRight" size={17} strokeWidth={2.2} />
        </button>
      </div>

      <button
        type="button"
        onClick={onToday}
        className={cx(
          'flex h-11 items-center gap-1.5 rounded-full border border-white/60 bg-surface/80 px-4 text-[13px] font-semibold text-ink-2 shadow-card backdrop-blur-xl transition-all hover:text-ink hover:shadow-lift',
          atMax ? 'pointer-events-none w-0 overflow-hidden border-0 px-0 opacity-0' : 'opacity-100'
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Today
      </button>
    </div>
  );
}
