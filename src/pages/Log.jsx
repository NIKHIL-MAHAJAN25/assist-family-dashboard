import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLogEntrySaved } from '../api/logEntries.js';
import { useEntries, useNow, useZones } from '../lib/hooks.js';
import { CATEGORIES, buildIncidents, buildMoments, dayBounds, ribbonSegments } from '../lib/story.js';
import { formatDayLabel, formatTime } from '../utils/datetime.js';
import IncidentCard from '../components/IncidentCard.jsx';
import DayPicker from '../components/DayPicker.jsx';
import { SKIES, SkyBackdrop } from '../components/DaySky.jsx';
import { GRADIENT, MomentCard, Tile, TileHead, avatar, icon, label } from '../components/Tiles.jsx';
import { buildCloudinaryUrl } from '../api/client.js';
import { ErrorNote, Icon, Loading, cx } from '../ui';

const toKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const fromKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// The day in four plain parts instead of a 24-hour ribbon.
const PARTS = [
  { key: 'Morning', from: 5, to: 12, hint: '5 am – noon' },
  { key: 'Afternoon', from: 12, to: 17, hint: 'noon – 5 pm' },
  { key: 'Evening', from: 17, to: 21, hint: '5 – 9 pm' },
  { key: 'Night', from: 21, to: 29, hint: '9 pm – 5 am' },
];
const partOf = (t) => {
  const h = new Date(t).getHours();
  return PARTS.find((p) => (h < 5 ? h + 24 : h) >= p.from && (h < 5 ? h + 24 : h) < p.to)?.key || 'Night';
};
const SWATCH = { meal: '#CDE6FA', rest: '#E6F7B4', leisure: '#A9D4F5', out: '#D2F27C', unseen: '#F4A48C', other: '#E4E4DE' };

function fmt(min) {
  if (min < 1) return '<1m';
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

function PartTile({ part, segments, incidents, dayStart, now, isToday, onOpen }) {
  const a = dayStart + part.from * 3600000;
  const b = dayStart + part.to * 3600000;
  const byCat = {};
  for (const s of segments) {
    const o = Math.max(0, Math.min(b, s.end) - Math.max(a, s.start)) / 60000;
    if (o > 0) byCat[s.category] = (byCat[s.category] || 0) + o;
  }
  const rows = Object.entries(byCat)
    .filter(([c]) => c !== 'other')
    .sort((x, y) => y[1] - x[1])
    .slice(0, 3);
  const alerts = incidents.filter((i) => i.start >= a && i.start < b).length;
  const future = isToday && now < a;
  const current = isToday && now >= a && now < b;
  const dark = SKIES[part.key]?.dark;
  const Tag = future ? 'div' : 'button';
  return (
    <Tag
      {...(!future && { type: 'button', onClick: onOpen, 'aria-label': `Open ${part.key.toLowerCase()}` })}
      className={cx(
        'group relative flex min-h-[170px] min-w-0 flex-col overflow-hidden rounded-[20px] p-5 text-left',
        dark ? 'text-white' : 'text-ink',
        current && 'ring-2 ring-ink/80 ring-offset-2 ring-offset-transparent',
        future ? 'opacity-55' : 'transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(20,30,50,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink'
      )}
      style={{ background: SKIES[part.key]?.bg }}
    >
      <SkyBackdrop part={part.key} />
      <div className="relative flex items-baseline justify-between gap-2">
        <h3 className="font-serif text-[22px] leading-tight">{part.key}</h3>
        {current ? (
          <span className={cx('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', dark ? 'bg-white text-ink' : 'bg-ink text-white')}>now</span>
        ) : (
          <span className={cx('text-[11px]', dark ? 'text-white/55' : 'text-ink-3')}>{part.hint}</span>
        )}
      </div>
      {future ? (
        <p className={cx('relative mt-auto text-[13px]', dark ? 'text-white/60' : 'text-ink-3')}>Still to come.</p>
      ) : rows.length ? (
        <ul className="relative mt-4 space-y-2 text-[13px]">
          {rows.map(([c, m]) => (
            <li key={c} className="flex items-center gap-2.5">
              <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: SWATCH[c] }} />
              <span className={cx('min-w-0 truncate', dark ? 'text-white/75' : 'text-ink-2')}>{CATEGORIES[c]?.label || c}</span>
              <b className="ml-auto font-serif text-[16px] font-normal">{fmt(m)}</b>
            </li>
          ))}
        </ul>
      ) : (
        <p className={cx('relative mt-auto text-[13px]', dark ? 'text-white/60' : 'text-ink-3')}>Nothing seen by the camera.</p>
      )}
      {alerts > 0 && (
        <p className="relative mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#F4A48C] px-2.5 py-1 text-[11px] font-semibold">
          <Icon name="warning" size={12} /> {alerts} alert{alerts > 1 ? 's' : ''}
        </p>
      )}
      {!future && (
        <span className={cx('relative mt-auto pt-3 text-[12px] font-semibold opacity-0 transition group-hover:opacity-100', dark ? 'text-white/80' : 'text-ink-2')}>
          See {part.key.toLowerCase()} →
        </span>
      )}
    </Tag>
  );
}

/** Minutes per category inside one part of the day. */
function partBreakdown(part, segments, dayStart) {
  const a = dayStart + part.from * 3600000;
  const b = dayStart + part.to * 3600000;
  const byCat = {};
  for (const s of segments) {
    const o = Math.max(0, Math.min(b, s.end) - Math.max(a, s.start)) / 60000;
    if (o > 0) byCat[s.category] = (byCat[s.category] || 0) + o;
  }
  return Object.entries(byCat).filter(([c]) => c !== 'other').sort((x, y) => y[1] - x[1]);
}

/** The big sky header of a part-of-day page: what happened, how long, alerts, and its photos. */
function PartHero({ part, dayStart, segments, items, incidents, onBack, onPick }) {
  const sky = SKIES[part.key] || {};
  const dark = sky.dark;
  const rows = partBreakdown(part, segments, dayStart);
  const [broken, setBroken] = useState(() => new Set());
  const photos = items.filter((m) => m.image && !broken.has(m.image)).slice(0, 10);
  const alerts = incidents.length;
  return (
    <section className={cx('relative overflow-hidden rounded-[24px] p-6 sm:p-8', dark ? 'text-white' : 'text-ink')} style={{ background: sky.bg }}>
      <SkyBackdrop part={part.key} />
      <div className="relative flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className={cx('inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition', dark ? 'bg-white/15 hover:bg-white/25' : 'bg-white/70 hover:bg-white')}
        >
          ← Whole day
        </button>
        <span className={cx('text-[13px]', dark ? 'text-white/70' : 'text-ink-2')}>
          {new Date(dayStart).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · {part.hint}
        </span>
      </div>
      <h1 className="relative mt-4 font-serif text-[44px] leading-none sm:text-[56px]">{part.key}</h1>
      <p className={cx('relative mt-2 text-[14px]', dark ? 'text-white/75' : 'text-ink-2')}>
        {items.length ? `${items.length} moment${items.length > 1 ? 's' : ''}` : 'Nothing was recorded'}
        {alerts > 0 && ` · ${alerts} alert${alerts > 1 ? 's' : ''}`}
      </p>
      {rows.length > 0 && (
        <div className="relative mt-5 flex flex-wrap gap-2">
          {rows.map(([c, m]) => (
            <span key={c} className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px]', dark ? 'bg-white/10' : 'bg-white/75')}>
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: SWATCH[c] }} />
              {CATEGORIES[c]?.label || c}
              <b className="font-serif text-[15px] font-normal">{fmt(m)}</b>
            </span>
          ))}
        </div>
      )}
      {photos.length > 0 && (
        <div className="relative -mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1">
          {photos.map((m) => (
            <button
              key={`${m.kind}-${m.start}`}
              type="button"
              onClick={() => onPick(`${m.kind}-${m.start}`)}
              className="shrink-0 overflow-hidden rounded-[14px] ring-1 ring-black/5 transition hover:scale-[1.03]"
              title={`${formatTime(m.start)} · ${m.title}`}
            >
              <img src={buildCloudinaryUrl(m.image)} alt={m.title} className="h-[84px] w-[112px] object-cover" loading="lazy" onError={() => setBroken((b) => new Set(b).add(m.image))} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'activity', label: 'Camera' },
  { value: 'places', label: 'Places' },
  { value: 'flagged', label: 'Flagged' },
];

export default function Log() {
  const [params, setParams] = useSearchParams();
  const now = useNow();
  const todayKey = toKey(now);
  const dayKey = params.get('day') || todayKey;
  const filter = params.get('show') || 'all';
  const partKey = PARTS.some((p) => p.key === params.get('part')) ? params.get('part') : null;
  const part = PARTS.find((p) => p.key === partKey);
  const [dayStart, dayEnd] = dayBounds(fromKey(dayKey));
  const isToday = dayKey === todayKey;
  const [sel, setSel] = useState(null);

  const entries = useEntries({ from: dayStart, to: dayEnd - 1 });
  const zones = useZones();
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: ({ ids, value }) => Promise.all(ids.map((id) => updateLogEntrySaved(id, value))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entries'] }),
  });

  const { moments, incidents, segments, raw } = useMemo(() => {
    const list = entries.data || [];
    const z = zones.data || [];
    const m = buildMoments(list, z);
    return {
      raw: list.length,
      moments: m,
      incidents: buildIncidents(list, z),
      segments: ribbonSegments(m, dayStart, dayEnd, isToday ? now : dayEnd),
    };
  }, [entries.data, zones.data, dayStart, dayEnd, now, isToday]);

  const count = (f) =>
    moments.filter((m) => !partKey || partOf(m.start) === partKey).filter((m) => (f === 'all' ? true : f === 'activity' ? m.kind === 'activity' : f === 'places' ? m.kind === 'place' : m.flagged)).length;
  const inPart = (m) => !partKey || partOf(m.start) === partKey;
  // A part page reads like a story (oldest first); the whole day shows the newest first.
  const shown = (partKey ? [...moments] : [...moments].reverse())
    .filter(inPart)
    .filter((m) => (filter === 'all' ? true : filter === 'activity' ? m.kind === 'activity' : filter === 'places' ? m.kind === 'place' : m.flagged));
  const chosen = shown.find((m) => `${m.kind}-${m.start}` === sel) || shown[0];

  const setDay = (k) => {
    const next = new URLSearchParams(params);
    if (k === todayKey) next.delete('day');
    else next.set('day', k);
    setParams(next);
    setSel(null);
  };
  const go = (delta) => {
    const d = fromKey(dayKey);
    d.setDate(d.getDate() + delta);
    setDay(toKey(d));
  };
  const setPart = (k) => {
    const next = new URLSearchParams(params);
    if (k) next.set('part', k);
    else next.delete('part');
    setParams(next);
    setSel(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const setFilter = (v) => {
    const next = new URLSearchParams(params);
    next.set('show', v);
    setParams(next);
  };
  const week = Array.from({ length: 7 }, (_, i) => now - (6 - i) * 86400000);

  // Group the (newest-first) list under part-of-day headings.
  const groups = [];
  for (const m of shown) {
    const p = partOf(m.start);
    if (!groups.length || groups[groups.length - 1].part !== p) groups.push({ part: p, items: [] });
    groups[groups.length - 1].items.push(m);
  }

  const momentsTile = (
          <Tile>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-serif text-[24px] leading-tight">Moments</h2>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFilter(f.value)}
                    className={cx(
                      'rounded-full px-3.5 py-1.5 text-[12px] transition',
                      filter === f.value ? 'bg-ink text-white' : 'border border-black/10 bg-white/85 hover:bg-white'
                    )}
                  >
                    {f.label} <span className="opacity-60">{count(f.value)}</span>
                  </button>
                ))}
              </div>
            </div>

            {!shown.length ? (
              <p className="mt-6 text-[14px] text-ink-3">{partKey ? `Nothing in the ${partKey.toLowerCase()} matches this filter.` : raw ? 'No moments match this filter.' : 'Try an earlier day.'}</p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="min-w-0 space-y-4">
                  {groups.map((g, gi) => (
                    <div key={`${g.part}-${gi}`}>
                      {!partKey && <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{g.part}</p>}
                      <ul className="space-y-1">
                        {g.items.map((m) => {
                          const id = `${m.kind}-${m.start}`;
                          const on = chosen && id === `${chosen.kind}-${chosen.start}`;
                          const mins = Math.round((m.end - m.start) / 60000);
                          return (
                            <li key={id}>
                              <button
                                type="button"
                                onClick={() => setSel(id)}
                                className={cx('w-full rounded-[14px] px-3 py-2.5 text-left transition', on ? GRADIENT : 'hover:bg-black/[0.03]')}
                              >
                                <span className="flex justify-between text-[11px] text-ink-2">
                                  <span className={m.flagged ? 'font-semibold text-act' : ''}>{label(m)}</span>
                                  <span>
                                    {formatTime(m.start)}
                                    {mins >= 2 && ` · ${fmt(mins)}`}
                                  </span>
                                </span>
                                <span className="mt-1.5 flex items-center gap-2.5">
                                  <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full', on ? 'bg-white' : avatar(m))}>
                                    <Icon name={icon(m)} size={13} />
                                  </span>
                                  <span className="truncate font-serif text-[16px]">{m.title}</span>
                                  {m.entries?.some((e) => e.isSaved) && <Icon name="bookmark" size={13} fill="currentColor" className="ml-auto shrink-0" />}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
                {chosen && (
                  <div className="md:sticky md:top-24 md:self-start">
                    <MomentCard
                      key={`${chosen.kind}-${chosen.start}`}
                      m={chosen}
                      onToggleSave={(m, value) => save.mutate({ ids: m.entries.filter((e) => e.imagePublicId).map((e) => e.id), value })}
                    />
                  </div>
                )}
              </div>
            )}
          </Tile>
  );

  if (partKey && part) {
    return (
      <div className="grid gap-3">
        <PartHero
          part={part}
          dayStart={dayStart}
          segments={segments}
          items={moments.filter(inPart)}
          incidents={incidents.filter((i) => partOf(i.start) === partKey)}
          onBack={() => setPart(null)}
          onPick={setSel}
        />
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Part of the day">
          {PARTS.map((p) => {
            const future = isToday && now < dayStart + p.from * 3600000;
            return (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={p.key === partKey}
                disabled={future}
                onClick={() => setPart(p.key)}
                className={cx(
                  'rounded-full px-4 py-2 text-[13px] transition disabled:opacity-40',
                  p.key === partKey ? 'bg-ink text-white' : 'border border-black/10 bg-white/85 hover:bg-white'
                )}
              >
                {p.key}
              </button>
            );
          })}
        </div>
        {momentsTile}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <Tile>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[36px] leading-[1.05] sm:text-[44px]">{formatDayLabel(dayStart)}</h1>
            <p className="mt-2 text-[14px] text-ink-2">
              {entries.isLoading
                ? ' '
                : raw
                  ? `${moments.length} moments, from ${raw} camera and watch readings.`
                  : 'Nothing was recorded on this day.'}
            </p>
          </div>
          <DayPicker value={dayKey} max={todayKey} onStep={go} onChange={setDay} onToday={() => setDay(todayKey)} />
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1.5">
          {week.map((t) => {
            const k = toKey(t);
            const on = k === dayKey;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setDay(k)}
                className={cx('rounded-2xl py-2 text-center transition', on ? 'bg-[#A9D4F5]' : 'hover:bg-black/[0.04]')}
              >
                <span className="block text-[10px] uppercase text-ink-3">{new Date(t).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                <span className="block font-serif text-[20px]">{new Date(t).getDate()}</span>
              </button>
            );
          })}
        </div>
      </Tile>

      {entries.isError && <ErrorNote error={entries.error} />}
      {entries.isLoading ? (
        <Loading />
      ) : (
        <>
          {raw > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {PARTS.map((p) => (
                <PartTile key={p.key} part={p} segments={segments} incidents={incidents} dayStart={dayStart} now={now} isToday={isToday} onOpen={() => setPart(p.key)} />
              ))}
            </div>
          )}

          {incidents.length > 0 && (
            <Tile>
              <TileHead title="Alerts" />
              <div className="mt-4 space-y-2">
                {incidents.map((i) => (
                  <IncidentCard key={i.id} incident={i} />
                ))}
              </div>
            </Tile>
          )}

          {momentsTile}
          <p className="pb-2 text-center text-[12px] text-ink-3">Photos are deleted after 7 days. Pick a moment and press “Keep photo” to hold on to it.</p>
        </>
      )}
    </div>
  );
}
