import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useEntries, useNow, useQuizHistory, useStatus, useZones } from '../lib/hooks.js';
import { buildIncidents, buildMoments, dayBounds, daySummary, ribbonSegments } from '../lib/story.js';
import { buildCloudinaryUrl, enhancedPhoto } from '../api/client.js';
import { formatTime, timeAgo } from '../utils/datetime.js';
import ZoneMap from '../components/ZoneMap.jsx';
import CameraWindow from '../components/CameraWindow.jsx';
import IncidentCard from '../components/IncidentCard.jsx';
import Tour from '../components/Tour.jsx';
import { ErrorNote, Icon, Loading, StatusDot, cx } from '../ui';

const STALE_MIN = 45;
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 am – 10 pm
const GRADIENT = 'bg-[linear-gradient(135deg,#9FD0F7_0%,#C6EBA0_55%,#D9F57E_100%)]';

function greeting(h) {
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function dur(min) {
  if (!min) return { v: '0', u: 'm' };
  if (min < 60) return { v: String(Math.round(min)), u: 'm' };
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return { v: m ? `${h}:${String(m).padStart(2, '0')}` : String(h), u: 'h' };
}

const dayKey = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ---- tiles -----------------------------------------------------------------------------------

function Tile({ children, className, tour }) {
  return (
    <section data-tour={tour} className={cx('min-w-0 rounded-[20px] bg-paper p-5 sm:p-6', className)}>
      {children}
    </section>
  );
}

function TileHead({ title, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-serif text-[24px] leading-tight">{title}</h2>
      {children}
    </div>
  );
}

function Pill({ to, children, dark }) {
  const cls = cx(
    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] transition',
    dark ? 'bg-ink text-white hover:bg-black' : 'border border-black/10 bg-white/85 hover:bg-white'
  );
  return to ? <Link to={to} className={cls}>{children}</Link> : <span className={cls}>{children}</span>;
}

function GoButton({ to, label }) {
  return (
    <Link to={to} aria-label={label} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-white transition hover:scale-105">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M7 17L17 7M9 7h8v8" /></svg>
    </Link>
  );
}

// Lime = fine, sand = worth a look, coral = act. The chip is the only place status colour appears.
const CHIP = { ok: 'bg-[#D2F27C]', watch: 'bg-[#F6D38B]', act: 'bg-[#F4A48C]', none: 'bg-[#E4E4DE]' };

function Stat({ label, value, unit, chip, tone = 'ok' }) {
  return (
    <div className="flex min-h-[118px] min-w-0 flex-col rounded-[20px] bg-paper p-5">
      <p className="text-[13px] text-ink-2">{label}</p>
      <div className="mt-auto flex items-end justify-between gap-2">
        <span className="font-serif text-[44px] leading-none">
          {value}
          {unit && <small className="text-[24px]">{unit}</small>}
        </span>
        <span className={cx('grid h-10 min-w-10 place-items-center rounded-full px-2 text-[10px] font-semibold', CHIP[tone])}>{chip}</span>
      </div>
    </div>
  );
}

function Hello({ firstName, now, tone, where, summary, open, dayStart }) {
  const verdict = { ok: 'Everything looks normal', watch: 'Worth a look', act: 'Needs you now' }[tone];
  return (
    <Tile tour="status" className="flex flex-col">
      <h1 className="font-serif text-[36px] leading-[1.05] sm:text-[44px]">
        {greeting(new Date(now).getHours())}
        {firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="mt-3 max-w-[680px] text-[14px] leading-relaxed text-ink-2">
        {where} {summary}
      </p>
      <p className="mt-4">
        <span className={cx('inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold', CHIP[tone])}>
          <StatusDot tone={tone} pulse={tone === 'act'} /> {verdict}
        </span>
      </p>
      {open.length > 0 && (
        <div className="mt-4 space-y-2">
          {open.map((i) => (
            <IncidentCard key={i.id} incident={i} showDate={i.start < dayStart} embedded />
          ))}
        </div>
      )}
    </Tile>
  );
}

// Smooth line through the hourly activity, Atria-style, with a black bubble at "now".
function smooth(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1] || pts[i];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const [x3, y3] = pts[i + 2] || pts[i + 1];
    d += ` C ${x1 + (x2 - x0) / 6} ${y1 + (y2 - y0) / 6}, ${x2 - (x3 - x1) / 6} ${y2 - (y3 - y1) / 6}, ${x2} ${y2}`;
  }
  return d;
}

function DayChart({ segments, now, dayStart }) {
  const nowH = new Date(now).getHours();
  const mins = HOURS.map((h) => {
    const a = dayStart + h * 3600000;
    const b = a + 3600000;
    return segments.reduce((t, s) => (s.category === 'other' ? t : t + Math.max(0, Math.min(b, s.end) - Math.max(a, s.start)) / 60000), 0);
  });
  const total = mins.reduce((a, b) => a + b, 0);
  const W = 400;
  const H = 200;
  const past = HOURS.filter((h) => h <= nowH);
  const pts = past.map((h, i) => [((h - 6) / (HOURS.length - 1)) * W, H - 14 - (Math.min(60, mins[i]) / 60) * (H - 40)]);
  const last = pts[pts.length - 1];
  const t = dur(total);
  return (
    <section data-tour="day" className={cx('relative flex min-h-[340px] min-w-0 flex-col overflow-hidden rounded-[20px] p-5 sm:p-6', GRADIENT)}>
      <TileHead title="The day so far">
        <Pill to="/log">Full day ›</Pill>
      </TileHead>
      <p className="mt-4 font-serif text-[72px] leading-none">
        {t.v}
        <small className="ml-1 font-sans text-[14px] text-ink-2">{t.u === 'h' ? 'hours active today' : 'minutes active today'}</small>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-x-0 bottom-14 h-[48%] w-full">
        <path d={smooth(pts)} fill="none" stroke="#151515" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
      {last && nowH >= 6 && nowH <= 22 && (
        <span
          className="absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ink font-serif text-[18px] text-white"
          style={{ left: `${(last[0] / W) * 100}%`, bottom: `calc(56px + ${(1 - last[1] / H) * 48}%)`, transform: 'translate(-50%, 50%)' }}
          title="Minutes active this hour"
        >
          {Math.round(mins[past.length - 1] || 0)}
        </span>
      )}
      <div className="relative mt-auto flex justify-between font-serif text-[14px]">
        {['6 am', '9 am', 'Noon', '3 pm', '6 pm', '9 pm'].map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </section>
  );
}

function MemoryTile({ quiz, dayStart }) {
  const today = quiz.filter((q) => new Date(q.date).getTime() >= dayStart);
  const week = quiz.filter((q) => new Date(q.date).getTime() >= dayStart - 6 * 86400000);
  const right = (qs) => qs.filter((q) => q.attempts?.some((a) => a.correct)).length;
  const answered = (qs) => qs.filter((q) => q.attempts?.length).length;
  const rate = answered(week) ? Math.round((right(week) / answered(week)) * 100) : null;
  return (
    <Tile tour="memory" className="flex flex-col">
      <TileHead title="Memory">
        <GoButton to="/memory" label="Open memory" />
      </TileHead>
      <p className="mt-4 font-serif text-[52px] leading-none">
        {rate == null ? '—' : rate}
        {rate != null && <small className="text-[28px]">%</small>}
        <small className="ml-2 font-sans text-[13px] text-ink-3">remembered this week</small>
      </p>
      <ul className="mt-5 space-y-2.5 text-[13px]">
        {today.length ? (
          today.slice(0, 3).map((q) => {
            const a = q.attempts?.[q.attempts.length - 1];
            return (
              <li key={q.id} className="flex items-start gap-2.5">
                <span className={cx('mt-0.5 h-3 w-3 shrink-0 rounded-[4px]', !a ? 'bg-[#E4E4DE]' : a.correct ? 'bg-[#D2F27C]' : 'bg-[#F6D38B]')} />
                <span className="min-w-0 text-ink-2">{q.question}</span>
              </li>
            );
          })
        ) : (
          <li className="text-ink-3">No quiz yet today. It’s made from the day’s activity.</li>
        )}
      </ul>
    </Tile>
  );
}

function PlacesTile({ status, zones, moments }) {
  const outsideMin = moments
    .filter((m) => m.kind === 'place' && !m.inside)
    .reduce((t, m) => t + Math.max(m.end - m.start, 5 * 60000) / 60000, 0);
  const here = status.location?.zone_name;
  const o = dur(outsideMin);
  return (
    <Tile tour="places" className="flex flex-col">
      <TileHead title="Places">
        <GoButton to="/places" label="Open places" />
      </TileHead>
      <p className="mt-4 font-serif text-[52px] leading-none">
        {o.v}
        <small className="text-[28px]">{o.u}</small>
        <small className="ml-2 font-sans text-[13px] text-ink-3">outside the safe places</small>
      </p>
      <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5 text-[13px]">
        {zones.slice(0, 4).map((z, i) => (
          <li key={z.id} className="flex items-center gap-2.5 text-ink-2">
            <span className={cx('h-3 w-3 rounded-[4px]', ['bg-[#CDE6FA]', 'bg-[#D2F27C]', 'bg-[#A9D4F5]', 'bg-[#E6F7B4]'][i % 4])} />
            <span className="truncate">{z.name}</span>
            {here === z.name && <b className="ml-auto font-serif text-[15px] font-normal text-ink">now</b>}
          </li>
        ))}
        {!zones.length && <li className="col-span-2 text-ink-3">No safe places yet.</li>}
      </ul>
    </Tile>
  );
}

// ---- moments: Atria's schedule list + patient card --------------------------------------------

const KIND_LABEL = { meal: 'Meal', rest: 'Resting', leisure: 'Leisure', out: 'Out', unseen: 'Not visible', other: 'Quiet' };
const AVATAR = { meal: 'bg-[#CDE6FA]', rest: 'bg-[#E6F7B4]', leisure: 'bg-[#A9D4F5]', out: 'bg-[#D2F27C]', unseen: 'bg-[#F4A48C]', other: 'bg-[#E4E4DE]' };
const ICON = { meal: 'clock', rest: 'home', leisure: 'heart', out: 'walk', unseen: 'warning', other: 'dot' };

const label = (m) => (m.kind === 'place' ? 'Place' : m.kind === 'vitals' ? 'Watch' : KIND_LABEL[m.category] || 'Moment');
const avatar = (m) => (m.flagged ? 'bg-[#F4A48C]' : m.kind === 'place' ? (m.inside ? 'bg-[#D2F27C]' : 'bg-[#F4A48C]') : AVATAR[m.category] || 'bg-[#E4E4DE]');
const icon = (m) => (m.kind === 'place' ? 'pin' : m.kind === 'vitals' ? 'heartPulse' : ICON[m.category] || 'dot');

function MomentCard({ m }) {
  const [stage, setStage] = useState(0);
  const url = m.image && buildCloudinaryUrl(m.image);
  const photo = enhancedPhoto(m.image, 720, 320);
  const mins = Math.round((m.end - m.start) / 60000);
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-full', avatar(m))}>
          <Icon name={icon(m)} size={17} />
        </span>
        <h3 className="min-w-0 flex-1 font-serif text-[22px] leading-tight">{m.title}</h3>
        <GoButton to="/log" label="Open in the log" />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-3">
        <span>
          <Icon name="calendar" size={13} className="mr-1 inline -mt-0.5" />
          <b className="font-medium text-ink">{formatTime(m.start)}{mins >= 2 ? ` – ${formatTime(m.end)}` : ''}</b>
        </span>
        <span>Kind <b className="font-medium text-ink">{label(m)}</b></span>
        {m.confidence != null && (
          <span>Camera <b className="font-medium text-ink">{m.confidence >= 0.8 ? 'sure' : m.confidence >= 0.6 ? 'fairly sure' : 'unsure'}</b></span>
        )}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
        {m.detail || (m.kind === 'place' ? 'Location reading from the watch or phone.' : 'No further detail.')}
        {m.objects?.length > 0 && ` Seen: ${m.objects.slice(0, 4).join(', ')}.`}
      </p>
      {url && stage < 2 && (
        <img
          key={m.image}
          src={stage === 0 ? photo.src : photo.fallback}
          alt=""
          onError={() => setStage((x) => x + 1)}
          className="mt-4 h-[180px] w-full rounded-2xl object-cover"
        />
      )}
    </div>
  );
}

function Moments({ moments }) {
  const list = [...moments].reverse().slice(0, 8);
  const [sel, setSel] = useState(0);
  const chosen = list[Math.min(sel, list.length - 1)];
  return (
    <Tile tour="moments">
      <TileHead title="Moments">
        <Pill to="/log" dark>View full log</Pill>
      </TileHead>
      {!list.length ? (
        <p className="mt-6 text-[14px] text-ink-3">Nothing recorded yet today. Moments from the camera and watch show up here as they happen.</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <ul className="min-w-0 space-y-1">
            {list.map((m, i) => (
              <li key={`${m.kind}-${m.start}`}>
                <button
                  type="button"
                  onClick={() => setSel(i)}
                  className={cx('w-full rounded-[14px] px-3 py-2.5 text-left transition', i === sel ? GRADIENT : 'hover:bg-black/[0.03]')}
                >
                  <span className="flex justify-between text-[11px] text-ink-2">
                    <span className={m.flagged ? 'font-semibold text-act' : ''}>{label(m)}</span>
                    <span>{formatTime(m.start)}</span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-2.5">
                    <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full', i === sel ? 'bg-white' : avatar(m))}>
                      <Icon name={icon(m)} size={13} />
                    </span>
                    <span className="truncate font-serif text-[16px]">{m.title}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {chosen && <MomentCard key={`${chosen.kind}-${chosen.start}`} m={chosen} />}
        </div>
      )}
    </Tile>
  );
}

// ---- rail ------------------------------------------------------------------------------------

function MonthCalendar({ now, activeDays }) {
  const [offset, setOffset] = useState(0);
  const today = new Date(now);
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const lead = (first.getDay() + 6) % 7;
  const inMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: inMonth }, (_, k) => k + 1)];
  while (cells.length % 7) cells.push(null);
  const todayKey = dayKey(now);
  return (
    <Tile tour="week">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setOffset((o) => o - 1)} aria-label="Previous month" className="grid h-8 w-8 place-items-center rounded-full hover:bg-black/[0.04]">
          <Icon name="chevronLeft" size={18} />
        </button>
        <span className="text-[13px]">{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
        <button type="button" onClick={() => setOffset((o) => Math.min(0, o + 1))} disabled={offset === 0} aria-label="Next month" className="grid h-8 w-8 place-items-center rounded-full hover:bg-black/[0.04] disabled:opacity-25">
          <Icon name="chevronRight" size={18} />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 text-center text-[10px] uppercase text-ink-3">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((w) => (
          <span key={w} className="pb-2">{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((n, k) => {
          if (!n) return <span key={`x${k}`} />;
          const t = new Date(first.getFullYear(), first.getMonth(), n).getTime();
          const key = dayKey(t);
          const isToday = key === todayKey;
          const future = t > now;
          const inner = (
            <span
              className={cx(
                'relative mx-auto grid h-9 w-9 place-items-center rounded-full font-serif text-[15px] transition',
                isToday ? 'bg-[#D2F27C]' : future ? 'text-ink-4' : 'hover:bg-black/[0.04]'
              )}
            >
              {n}
              {activeDays.has(key) && !isToday && <i className="absolute bottom-1 h-1 w-1 rounded-full bg-[#7FBDEB]" />}
            </span>
          );
          return future ? (
            <span key={key}>{inner}</span>
          ) : (
            <Link key={key} to={isToday ? '/log' : `/log?day=${key}`} title="Open this day's log">
              {inner}
            </Link>
          );
        })}
      </div>
    </Tile>
  );
}

function DeviceLine({ icon: ic, name, last, now }) {
  const mins = last ? Math.floor((now - last) / 60000) : null;
  const tone = mins == null ? 'none' : mins <= STALE_MIN ? 'ok' : 'watch';
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#CDE6FA]">
        <Icon name={ic} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-[16px] leading-tight">{name}</span>
        <span className="block text-[11px] text-ink-3">{last ? `Heard ${timeAgo(last, now)}` : 'Nothing today'}</span>
      </span>
      <span className={cx('rounded-full px-2.5 py-1 text-[10px] font-semibold', CHIP[tone])}>
        {tone === 'ok' ? 'on' : tone === 'watch' ? 'quiet' : 'off'}
      </span>
    </li>
  );
}

// ---- page ------------------------------------------------------------------------------------

const TOUR = [
  { target: 'status', key: 'Start here', color: '#D2F27C', title: 'Is {name} okay?', body: 'The chip under the greeting says it in one line. If something needs you, the details sit right below it.' },
  { target: 'day', key: 'The day', color: '#CDE6FA', title: 'The day at a glance', body: 'How active {name} has been, hour by hour. The black bubble is now.' },
  { target: 'stats', key: 'Numbers', color: '#D2F27C', title: 'Four numbers', body: 'Last seen, readings that need a look, today’s quiz and time outside. The round chip turns sand or coral when one needs you.' },
  { target: 'memory', key: 'Memory', color: '#A9D4F5', title: 'How {name}’s memory is doing', body: 'The week’s score and today’s questions. The arrow opens every answer.' },
  { target: 'places', key: 'Places', color: '#D2F27C', title: 'Where {name} went', body: 'Time outside the safe places, and which one {name} is in now.' },
  { target: 'moments', key: 'Moments', color: '#CDE6FA', title: 'What the camera saw', body: 'The day, newest first. Pick a moment to see the photo and what the camera made of it.' },
  { target: 'week', key: 'Other days', color: '#A9D4F5', title: 'Look back', body: 'Tap any day to open its full log. Days with a dot have readings.' },
  { target: 'camera', key: 'Right now', color: '#D2F27C', title: 'The latest photo', body: 'The most recent photo from the home camera. That’s the tour — the ? button brings it back any time.' },
];

export default function Today() {
  const { user } = useAuth();
  const now = useNow();
  const [dayStart, dayEnd] = dayBounds();
  const weekAgo = dayStart - 7 * 86400000;

  const status = useStatus();
  const entries = useEntries({ from: weekAgo });
  const zones = useZones();
  const quiz = useQuizHistory();

  const d = useMemo(() => {
    const all = entries.data || [];
    const z = zones.data || [];
    const todays = all.filter((e) => new Date(e.timestamp).getTime() >= dayStart);
    const moments = buildMoments(todays, z);
    const incidents = buildIncidents(all, z);
    const todaysIncidents = incidents.filter((i) => i.start >= dayStart);
    const olderOpen = incidents.filter((i) => i.start < dayStart && !i.acknowledged);
    const path = todays
      .filter((e) => e.entryType === 'geofence' && typeof e.payload?.lat === 'number')
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map((e) => ({ lat: e.payload.lat, lng: e.payload.lng, flagged: e.requiresAttention, label: formatTime(e.timestamp) }));
    const lastOf = (pred) => {
      const hit = todays.filter(pred).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      return hit ? new Date(hit.timestamp).getTime() : null;
    };
    return {
      moments,
      todaysIncidents,
      open: [...olderOpen, ...todaysIncidents].filter((i) => !i.acknowledged),
      path,
      segments: ribbonSegments(moments, dayStart, dayEnd, now),
      lastCamera: lastOf((e) => e.entryType === 'frame'),
      lastWatch: lastOf((e) => e.entryType !== 'frame'),
      activeDays: new Set(all.map((e) => dayKey(new Date(e.timestamp).getTime()))),
    };
  }, [entries.data, zones.data, dayStart, dayEnd, now]);

  if (status.isLoading || entries.isLoading) return <Loading label="Reading today" />;
  if (status.isError) return <ErrorNote error={status.error} />;

  const s = status.data;
  const name = s.patient?.name || 'Your person';
  const first = name.split(' ')[0];
  const outside = s.location?.inside_safe_zone === false;
  const tone = d.open.some((i) => !i.resolved) ? 'act' : d.open.length || s.is_stale || outside ? 'watch' : 'ok';
  const firstName = user?.name?.split(' ')[0];
  const where = s.location?.zone_name
    ? `${name} is ${s.location.zone_name.toLowerCase() === 'home' ? 'at home' : `at ${s.location.zone_name}`}.`
    : outside
      ? `${name} is outside the safe places.`
      : `${name}'s location isn't known yet.`;
  const summary = daySummary(name, d.moments, d.todaysIncidents);
  const loc = s.location;
  const current = loc?.lat != null ? { lat: loc.lat, lng: loc.lng } : null;

  const todaysQuiz = (quiz.data || []).filter((q) => new Date(q.date).getTime() >= dayStart);
  const quizRight = todaysQuiz.filter((q) => q.attempts?.some((a) => a.correct)).length;
  const outsideMin = d.moments
    .filter((m) => m.kind === 'place' && !m.inside)
    .reduce((t, m) => t + Math.max(m.end - m.start, 5 * 60000) / 60000, 0);
  const seen = s.minutes_since_update == null ? { v: '—', u: '' } : dur(s.minutes_since_update);
  const need = s.needs_attention_count || 0;
  const out = dur(outsideMin);

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid min-w-0 gap-3">
        <Hello firstName={firstName} now={now} tone={tone} where={where} summary={summary} open={d.open} dayStart={dayStart} />

        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <DayChart segments={d.segments} now={now} dayStart={dayStart} />
          <div data-tour="stats" className="grid grid-cols-2 gap-3">
            <Stat label="Last seen" value={seen.v} unit={seen.u} chip={s.is_stale ? 'late' : 'live'} tone={s.is_stale ? 'watch' : 'ok'} />
            <Stat label="Need a look" value={need} chip={need ? '!' : '✓'} tone={need ? (tone === 'act' ? 'act' : 'watch') : 'ok'} />
            <Stat
              label="Today’s quiz"
              value={todaysQuiz.length ? quizRight : '—'}
              unit={todaysQuiz.length ? `/${todaysQuiz.length}` : ''}
              chip={todaysQuiz.length ? `${Math.round((quizRight / todaysQuiz.length) * 100)}%` : '—'}
              tone={todaysQuiz.length ? 'ok' : 'none'}
            />
            <Stat label="Time outside" value={out.v} unit={out.u} chip={outside ? 'out' : 'safe'} tone={outside ? 'act' : 'ok'} />
          </div>
        </div>

        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          <MemoryTile quiz={quiz.data || []} dayStart={dayStart} />
          <PlacesTile status={s} zones={zones.data || []} moments={d.moments} />
        </div>

        <Moments moments={d.moments} />
      </div>

      <aside className="grid min-w-0 content-start gap-3">
        <MonthCalendar now={now} activeDays={d.activeDays} />
        <Tile tour="camera">
          <TileHead title="Right now">
            <Pill>
              <span className="h-1.5 w-1.5 rounded-full bg-act" /> Live
            </Pill>
          </TileHead>
          <CameraWindow entries={entries.data} now={now} className="mt-4 !rounded-2xl" />
        </Tile>
        <Tile>
          <TileHead title="Today’s route">
            <Pill to="/places">Edit places</Pill>
          </TileHead>
          <div className="mt-4 overflow-hidden rounded-2xl">
            <ZoneMap zones={zones.data || []} path={d.path} current={current} currentLabel={name} interactive={false} style={{ height: 240 }} />
          </div>
        </Tile>
        <Tile>
          <TileHead title="Devices" />
          <ul className="mt-2 divide-y divide-line">
            <DeviceLine icon="camera" name="Home camera" last={d.lastCamera} now={now} />
            <DeviceLine icon="watch" name="Watch & phone" last={d.lastWatch} now={now} />
          </ul>
        </Tile>
      </aside>

      <Tour id="today-v2" steps={TOUR} who={firstName} name={first} />
    </div>
  );
}
