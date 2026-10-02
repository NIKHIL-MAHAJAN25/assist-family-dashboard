import React, { useState } from 'react';
import { CATEGORIES, dayPart } from '../lib/story.js';
import { buildCloudinaryUrl } from '../api/client.js';
import { formatTime } from '../utils/datetime.js';
import { Badge, Icon, cx } from '../ui';

function duration(a, b) {
  const m = Math.round((b - a) / 60000);
  if (m < 2) return null;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function Thumb({ publicId, size = 56, className }) {
  const [broken, setBroken] = useState(false);
  const url = buildCloudinaryUrl(publicId);
  if (!url || broken) return null;
  // Cloudinary transforms keep thumbnails tiny instead of shipping full frames.
  const small = url.replace('/upload/', `/upload/c_fill,w_${size * 2},h_${size * 2}/`);
  return (
    <a href={url} target="_blank" rel="noreferrer" className={cx('shrink-0', className)}>
      <img
        src={small}
        alt=""
        onError={() => setBroken(true)}
        className="rounded border border-white/60 object-cover shadow-sm"
        style={{ width: size, height: size }}
      />
    </a>
  );
}

function Marker({ m, dark }) {
  if (m.kind === 'place') {
    return (
      <span
        className={cx(
          'grid h-7 w-7 place-items-center rounded-full border-2 bg-surface',
          m.flagged ? 'border-act text-act' : m.inside ? 'border-ok text-ok' : 'border-watch text-watch'
        )}
      >
        <Icon name="pin" size={14} strokeWidth={2} />
      </span>
    );
  }
  if (m.kind === 'vitals') {
    return (
      <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-act bg-surface text-act">
        <Icon name="heartPulse" size={14} strokeWidth={2} />
      </span>
    );
  }
  const cat = m.flagged ? 'unseen' : m.category;
  return (
    <span className="grid h-7 w-7 place-items-center">
      <span
        className={cx('h-3.5 w-3.5 rounded-full ring-4', dark ? 'ring-white/10' : 'ring-white/80')}
        style={{ background: CATEGORIES[cat]?.color }}
      />
    </span>
  );
}

const LIGHT = { time: 'text-ink-2', sub: 'text-ink-3', line: 'bg-black/10', title: 'text-ink', flag: 'text-act', meta: 'text-ink-3', faint: 'text-ink-4', warn: 'text-watch' };
const DARK = { time: 'text-white/85', sub: 'text-white/50', line: 'bg-white/15', title: 'text-white', flag: 'text-[#FCA5A5]', meta: 'text-white/60', faint: 'text-white/40', warn: 'text-[#FCD34D]' };

export function MomentRow({ m, last, onToggleSave, showObjects, dark = false }) {
  const range = m.end - m.start > 60000;
  const dur = duration(m.start, m.end);
  const saved = m.entries?.some((e) => e.isSaved);
  const c = dark ? DARK : LIGHT;
  return (
    <li className="group relative grid grid-cols-[86px_28px_1fr] gap-x-3">
      <div className={cx('pt-1 text-right text-sm', c.sub)}>
        <span className={cx('font-semibold', c.time)}>{formatTime(m.start)}</span>
        {range && <span className="block text-xs">to {formatTime(m.end)}</span>}
      </div>
      <div className="relative flex justify-center">
        {!last && <span className={cx('absolute bottom-0 top-8 w-px', c.line)} />}
        <Marker m={m} dark={dark} />
      </div>
      <div className={cx('flex min-w-0 gap-3 pb-5 pr-3', last && 'pb-1')}>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className={cx('font-semibold', m.flagged ? c.flag : c.title)}>{m.title}</p>
            {m.flagged && (
              <Badge tone={m.entries.every((e) => e.acknowledgedAt) ? 'neutral' : 'act'}>
                {m.entries.every((e) => e.acknowledgedAt) ? 'Handled' : 'Flagged'}
              </Badge>
            )}
          </div>
          <p className={cx('mt-0.5 text-sm', c.meta)}>
            {[m.detail, dur && `for ${dur}`, m.count > 1 && `${m.count} ${m.countLabel || 'sightings'}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {showObjects && m.objects?.length > 0 && (
            <p className={cx('mt-1 text-sm', c.meta)}>
              <span className={c.faint}>Noticed:</span> {m.objects.join(', ')}
            </p>
          )}
          {m.confidence != null && m.confidence < 0.6 && (
            <p className={cx('mt-1 flex items-center gap-1 text-xs font-semibold', c.warn)}>
              <Icon name="info" size={13} /> The camera wasn't sure about this one
            </p>
          )}
        </div>
        {m.image && <Thumb publicId={m.image} size={80} />}
        {onToggleSave && m.entries?.some((e) => e.imagePublicId) && (
          <button
            type="button"
            onClick={() => onToggleSave(m, !saved)}
            title={saved ? 'Photo kept — click to let it expire' : 'Keep photo past 7 days'}
            className={cx(
              'h-7 shrink-0 self-start rounded px-1.5 transition',
              saved ? 'text-accent' : cx(c.faint, 'opacity-0 group-hover:opacity-100')
            )}
          >
            <Icon name="bookmark" size={16} fill={saved ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
    </li>
  );
}

// Each part of the day gets its own sky: the light behind the rows says what time it was.
const SKIES = {
  Morning: {
    range: '5 am – noon',
    bg: 'linear-gradient(180deg, #FFE7CF 0%, #FFF4E8 50%, #FFFCF8 100%)',
    ink: 'text-[#9A4A12]',
    sun: { x: '30%', y: -34, color: '#FDBA74', glow: 'rgba(251,146,60,0.40)' },
  },
  Afternoon: {
    range: 'noon – 5 pm',
    bg: 'linear-gradient(180deg, #D3E9FF 0%, #EAF4FF 50%, #FAFCFF 100%)',
    ink: 'text-[#1E4F8A]',
    sun: { x: '52%', y: -48, color: '#FDE68A', glow: 'rgba(250,204,21,0.40)' },
  },
  Evening: {
    range: '5 pm – 9 pm',
    bg: 'linear-gradient(180deg, #F8CFDB 0%, #EEDFF7 50%, #FAF6FD 100%)',
    ink: 'text-[#7A2E5C]',
    sun: { x: '90%', y: -24, color: '#FB923C', glow: 'rgba(244,114,182,0.40)' },
  },
  Night: {
    range: '9 pm – 5 am',
    bg: 'linear-gradient(180deg, #0B1530 0%, #14234A 60%, #1B2C55 100%)',
    ink: 'text-white/85',
    dark: true,
  },
};

const STARS = [
  [6, 18], [14, 62], [22, 30], [31, 84], [39, 12], [47, 52], [55, 26], [63, 74], [71, 16], [79, 46], [86, 30], [93, 66],
];

function SkyBackdrop({ sky }) {
  if (sky.dark) {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {STARS.map(([x, y], i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${x}%`,
              top: y,
              width: i % 3 === 0 ? 2.5 : 1.5,
              height: i % 3 === 0 ? 2.5 : 1.5,
              animation: `twinkle ${2.5 + (i % 5) * 0.6}s ease-in-out ${i * 0.3}s infinite`,
            }}
          />
        ))}
        {/* crescent: a pale disc with a sky-coloured disc offset over it */}
        <span className="absolute left-[46%] top-4 h-9 w-9 rounded-full bg-[#F4EFD8] shadow-[0_0_34px_10px_rgba(244,239,216,0.22)]">
          <span className="absolute -right-1.5 -top-1.5 h-8 w-8 rounded-full bg-[#0D1834]" />
        </span>
      </div>
    );
  }
  const { sun } = sky;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <span
        className="absolute h-[150px] w-[150px] -translate-x-1/2 rounded-full"
        style={{ left: sun.x, top: sun.y - 20, background: `radial-gradient(circle, ${sun.glow} 0%, transparent 68%)` }}
      />
      <span
        className="absolute h-11 w-11 -translate-x-1/2 rounded-full"
        style={{ left: sun.x, top: sun.y + 34, background: sun.color, boxShadow: `0 0 24px 6px ${sun.glow}` }}
      />
    </div>
  );
}

export default function MomentList({ moments, newestFirst = true, onToggleSave, showObjects, groupByPart = true }) {
  const list = newestFirst ? [...moments].reverse() : moments;

  if (!groupByPart) {
    return (
      <ol>
        {list.map((m, i) => (
          <MomentRow
            key={`${m.kind}-${m.start}-${i}`}
            m={m}
            last={i === list.length - 1}
            onToggleSave={onToggleSave}
            showObjects={showObjects}
          />
        ))}
      </ol>
    );
  }

  // Consecutive moments in the same part of the day share one sky.
  const sections = [];
  for (const m of list) {
    const part = dayPart(m.start);
    const cur = sections[sections.length - 1];
    if (cur && cur.part === part) cur.items.push(m);
    else sections.push({ part, items: [m] });
  }

  return (
    <div className="space-y-3">
      <style>{'@keyframes twinkle { 0%,100% { opacity: .25 } 50% { opacity: 1 } }'}</style>
      {sections.map((sec, si) => {
        const sky = SKIES[sec.part];
        return (
          <section
            key={`${sec.part}-${si}`}
            className={cx('relative overflow-hidden rounded-lg ring-1', sky.dark ? 'ring-white/5' : 'ring-black/[0.04]')}
            style={{ background: sky.bg }}
          >
            <SkyBackdrop sky={sky} />
            <header className="relative flex items-baseline gap-2 px-5 pb-3 pt-4">
              <span className={cx('text-sm font-bold uppercase tracking-[0.1em]', sky.ink)}>{sec.part}</span>
              <span className={cx('text-xs', sky.dark ? 'text-white/45' : 'text-ink-3')}>{sky.range}</span>
            </header>
            <ol className="relative pb-3">
              {sec.items.map((m, i) => (
                <MomentRow
                  key={`${m.kind}-${m.start}-${i}`}
                  m={m}
                  dark={sky.dark}
                  last={i === sec.items.length - 1}
                  onToggleSave={onToggleSave}
                  showObjects={showObjects}
                />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
