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
        className="rounded border border-line object-cover"
        style={{ width: size, height: size }}
      />
    </a>
  );
}

function Marker({ m }) {
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
        className="h-3.5 w-3.5 rounded-full ring-4 ring-surface"
        style={{ background: CATEGORIES[cat]?.color }}
      />
    </span>
  );
}

export function MomentRow({ m, last, onToggleSave, showObjects }) {
  const range = m.end - m.start > 60000;
  const dur = duration(m.start, m.end);
  const saved = m.entries?.some((e) => e.isSaved);
  return (
    <li className="group relative grid grid-cols-[86px_28px_1fr] gap-x-3">
      <div className="pt-1 text-right text-sm text-ink-3">
        <span className="font-semibold text-ink-2">{formatTime(m.start)}</span>
        {range && <span className="block text-xs">to {formatTime(m.end)}</span>}
      </div>
      <div className="relative flex justify-center">
        {!last && <span className="absolute bottom-0 top-8 w-px bg-line" />}
        <Marker m={m} />
      </div>
      <div className={cx('flex min-w-0 gap-3 pb-5', last && 'pb-1')}>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className={cx('font-semibold', m.flagged ? 'text-act' : 'text-ink')}>{m.title}</p>
            {m.flagged && (
              <Badge tone={m.entries.every((e) => e.acknowledgedAt) ? 'neutral' : 'act'}>
                {m.entries.every((e) => e.acknowledgedAt) ? 'Handled' : 'Flagged'}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-ink-3">
            {[m.detail, dur && `for ${dur}`, m.count > 1 && `${m.count} ${m.countLabel || 'sightings'}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {showObjects && m.objects?.length > 0 && (
            <p className="mt-1 text-sm text-ink-3">
              <span className="text-ink-4">Noticed:</span> {m.objects.join(', ')}
            </p>
          )}
          {m.confidence != null && m.confidence < 0.6 && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-watch">
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
              saved ? 'text-accent' : 'text-ink-4 opacity-0 hover:text-ink group-hover:opacity-100'
            )}
          >
            <Icon name="bookmark" size={16} fill={saved ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
    </li>
  );
}

const PART_ICON = { Morning: '☀', Afternoon: '◐', Evening: '☾', Night: '✦' };

export default function MomentList({ moments, newestFirst = true, onToggleSave, showObjects, groupByPart = true }) {
  const list = newestFirst ? [...moments].reverse() : moments;
  let lastPart = null;
  return (
    <ol>
      {list.map((m, i) => {
        const part = dayPart(m.start);
        const header = groupByPart && part !== lastPart;
        lastPart = part;
        return (
          <React.Fragment key={`${m.kind}-${m.start}-${i}`}>
            {header && (
              <li className={cx('mb-3 flex items-center gap-2 pl-[98px]', i > 0 && 'mt-2')}>
                <span className="text-[13px] text-ink-4">{PART_ICON[part]}</span>
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-ink-3">{part}</span>
                <span className="h-px flex-1 bg-line" />
              </li>
            )}
            <MomentRow
              m={m}
              last={i === list.length - 1}
              onToggleSave={onToggleSave}
              showObjects={showObjects}
            />
          </React.Fragment>
        );
      })}
    </ol>
  );
}
