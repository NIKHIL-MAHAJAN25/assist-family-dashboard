import React, { useState } from 'react';
import { CATEGORIES } from '../lib/story.js';
import { formatTime } from '../utils/datetime.js';

const HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

function hourLabel(h) {
  if (h === 0 || h === 24) return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

/**
 * The whole day as one 24-hour strip: each stretch of activity is a coloured span,
 * incidents are red, and a marker shows "now". One glance answers "how has today been?"
 */
export default function DayRibbon({ segments, incidents = [], dayStart, now, isToday = true }) {
  const [hover, setHover] = useState(null);
  const span = 24 * 3600 * 1000;
  const pct = (t) => `${Math.min(100, Math.max(0, ((t - dayStart) / span) * 100))}%`;
  const width = (a, b) => `${Math.max(0.35, ((b - a) / span) * 100)}%`;
  const present = [...new Set(segments.map((s) => s.category))];

  return (
    <div>
      <div className="relative h-12 select-none" onMouseLeave={() => setHover(null)}>
        {/* track */}
        <div className="absolute inset-y-2 left-0 right-0 rounded-md bg-subtle ring-1 ring-inset ring-line" />
        {/* 3-hour gridlines */}
        {HOURS.slice(1, -1).map((h) => (
          <span
            key={h}
            className="absolute inset-y-2 w-px bg-line"
            style={{ left: `${(h / 24) * 100}%` }}
          />
        ))}
        {/* future shading */}
        {isToday && (
          <div
            className="absolute inset-y-2 right-0 rounded-r bg-[repeating-linear-gradient(135deg,transparent_0_5px,rgba(17,20,24,0.04)_5px_10px)]"
            style={{ left: pct(now) }}
          />
        )}
        {segments.map((s, i) => (
          <div
            key={i}
            className="absolute inset-y-[10px] rounded-[4px] transition-[transform,opacity] duration-150 hover:scale-y-[1.18] hover:opacity-90"
            style={{
              left: pct(s.start),
              width: `calc(${width(s.start, s.end)} - 1.5px)`,
              background: CATEGORIES[s.category]?.color,
            }}
            onMouseEnter={() => setHover({ ...s, x: pct(s.start + (s.end - s.start) / 2) })}
          />
        ))}
        {incidents.map((inc) => (
          <div
            key={inc.id}
            className="absolute inset-y-0 border-x-2 border-act bg-act/15"
            style={{ left: pct(inc.start), width: width(inc.start, inc.end) }}
            onMouseEnter={() =>
              setHover({
                title: inc.title,
                start: inc.start,
                end: inc.end,
                category: 'unseen',
                x: pct(inc.start + (inc.end - inc.start) / 2),
              })
            }
          >
            <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-act" />
          </div>
        ))}
        {isToday && (
          <div className="absolute inset-y-0 z-10 w-0.5 bg-ink shadow-[0_0_0_3px_rgba(17,20,24,0.12)]" style={{ left: pct(now) }}>
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-sm bg-ink px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-white">
              Now
            </span>
          </div>
        )}
        {hover && (
          <div
            className="pointer-events-none absolute bottom-full z-20 mb-6 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2.5 py-1.5 text-sm text-white shadow-pop"
            style={{ left: hover.x }}
          >
            <span className="font-semibold">{hover.title}</span>
            <span className="ml-2 text-white/60">
              {formatTime(hover.start)}–{formatTime(hover.end)}
            </span>
          </div>
        )}
      </div>
      <div className="relative mt-1 h-4 text-xs text-ink-4">
        {HOURS.map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2"
            style={{ left: `${(h / 24) * 100}%`, transform: h === 0 ? 'none' : h === 24 ? 'translateX(-100%)' : undefined }}
          >
            {hourLabel(h)}
          </span>
        ))}
      </div>
      {present.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {present.map((c) => (
            <span key={c} className="flex items-center gap-1.5 text-sm text-ink-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CATEGORIES[c].color }} />
              {CATEGORIES[c].label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
