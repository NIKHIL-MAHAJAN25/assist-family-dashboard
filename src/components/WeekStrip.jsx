import React, { useMemo } from 'react';
import { useEntries, useZones } from '../lib/hooks.js';
import { CATEGORIES, buildIncidents, buildMoments, dayBounds, ribbonSegments } from '../lib/story.js';
import { cx } from '../ui';

const DAY_MS = 86400000;

/**
 * Seven days side by side, each with a tiny version of its day ribbon, so a caregiver can
 * spot the unusual day before opening it. A red dot marks days that had an incident.
 */
export default function WeekStrip({ selected, today, onSelect }) {
  // Keep the selected day roughly in the middle, but never show future days.
  const end = Math.min(dayBounds(today)[0], dayBounds(selected)[0] + 3 * DAY_MS);
  const start = end - 6 * DAY_MS;
  const entries = useEntries({ from: start, to: end + DAY_MS - 1 });
  const zones = useZones();

  const days = useMemo(() => {
    const all = entries.data || [];
    const z = zones.data || [];
    return Array.from({ length: 7 }, (_, i) => {
      const ds = start + i * DAY_MS;
      const de = ds + DAY_MS;
      const list = all.filter((e) => {
        const t = new Date(e.timestamp).getTime();
        return t >= ds && t < de;
      });
      const moments = buildMoments(list, z);
      return {
        start: ds,
        count: list.length,
        segments: ribbonSegments(moments, ds, de, Math.min(de, Date.now())),
        incidents: buildIncidents(list, z).length,
      };
    });
  }, [entries.data, zones.data, start]);

  const selStart = dayBounds(selected)[0];

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => {
        const date = new Date(d.start);
        const active = d.start === selStart;
        const isToday = d.start === dayBounds(today)[0];
        return (
          <button
            key={d.start}
            type="button"
            onClick={() => onSelect(date)}
            className={cx(
              'group relative rounded-xl border p-2.5 text-left transition-all',
              active
                ? 'border-ink bg-ink text-white shadow-pop'
                : 'border-white/80 bg-white/75 shadow-card backdrop-blur-xl hover:-translate-y-0.5 hover:shadow-lift'
            )}
          >
            <div className="flex items-baseline justify-between">
              <span className={cx('text-xs font-semibold uppercase tracking-wide', active ? 'text-white/70' : 'text-ink-3')}>
                {isToday ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
              {d.incidents > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-act">
                  <span className="h-1.5 w-1.5 rounded-full bg-act" />
                  {d.incidents}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-lg font-bold leading-tight">{date.getDate()}</p>
            <div className={cx('relative mt-2 h-1.5 overflow-hidden rounded-full', active ? 'bg-white/15' : 'bg-subtle')}>
              {d.segments.map((s, i) => (
                <span
                  key={i}
                  className="absolute inset-y-0"
                  style={{
                    left: `${((s.start - d.start) / DAY_MS) * 100}%`,
                    width: `${Math.max(0.6, ((s.end - s.start) / DAY_MS) * 100)}%`,
                    background: CATEGORIES[s.category]?.color,
                  }}
                />
              ))}
            </div>
            <p className={cx('mt-1.5 text-[11px]', active ? 'text-white/60' : 'text-ink-4')}>
              {d.count ? `${d.count} readings` : 'No data'}
            </p>
          </button>
        );
      })}
    </div>
  );
}
