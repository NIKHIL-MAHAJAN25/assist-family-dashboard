import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useEntries, useNow, useQuizHistory, useStatus, useZones } from '../lib/hooks.js';
import { buildIncidents, buildMoments, dayBounds, daySummary, ribbonSegments } from '../lib/story.js';
import { buildCloudinaryUrl } from '../api/client.js';
import { formatTime, timeAgo } from '../utils/datetime.js';
import ZoneMap from '../components/ZoneMap.jsx';
import CameraWindow from '../components/CameraWindow.jsx';
import IncidentCard from '../components/IncidentCard.jsx';
import Tour from '../components/Tour.jsx';
import { ErrorNote, Icon, Loading, StatusDot, cx } from '../ui';

const STALE_MIN = 45;
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 am – 10 pm

function greeting(h) {
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function dur(min) {
  if (!min) return { v: '0', u: 'min' };
  if (min < 60) return { v: String(Math.round(min)), u: 'min' };
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return { v: m ? `${h}:${String(m).padStart(2, '0')}` : String(h), u: 'h' };
}

const dayKey = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ---- the four colour blocks --------------------------------------------------------------

function Block({ tone, shape, title, to, children, className, tour }) {
  const body = (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0">{shape}</span>
      <div className="relative flex items-start justify-between gap-3">
        <h3 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h3>
        {to && (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/50 opacity-0 transition group-hover:opacity-100">
            <Icon name="chevronRight" size={16} />
          </span>
        )}
      </div>
      <div className="relative">{children}</div>
    </>
  );
  const cls = cx('group relative block min-w-0 overflow-hidden rounded-[22px] p-5 text-ink sm:p-6', tone, className);
  return to ? (
    <Link to={to} className={cls} data-tour={tour}>{body}</Link>
  ) : (
    <section className={cls} data-tour={tour}>{body}</section>
  );
}

function Stats({ items }) {
  return (
    <dl className="mt-3 flex flex-wrap gap-x-7 gap-y-2">
      {items.map((s) => (
        <div key={s.k}>
          <dd className="text-[17px] font-semibold leading-tight">
            {s.v}
            {s.u && <small className="ml-0.5 text-[12px] font-normal">{s.u}</small>}
          </dd>
          <dt className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.07em] text-ink/60">{s.k}</dt>
        </div>
      ))}
    </dl>
  );
}

const STATUS_TONE = { ok: 'bg-sage', watch: 'bg-[#F3C77E]', act: 'bg-coral' };
const STATUS_SHAPE = { ok: '#8A9E62', watch: '#E8AE55', act: '#E2856C' };

function StatusBlock({ status, tone, incidents, now }) {
  const name = status.patient?.name || 'Your person';
  const outside = status.location?.inside_safe_zone === false;
  const where = status.location?.zone_name || (outside ? 'Outside' : '—');
  const first = name.split(' ')[0];
  const title = { ok: `${first} is okay`, watch: 'Worth a look', act: 'Needs you now' }[tone];
  const line = status.is_stale
    ? `No update from the camera or watch for ${timeAgo(status.last_update, now).replace(' ago', '')}. Check the devices are on.`
    : incidents.length
      ? incidents[0].title
      : status.current_activity
        ? `${status.current_activity}.`
        : 'All quiet.';
  return (
    <Block
      tour="status"
      tone={STATUS_TONE[tone]}
      title={title}
      shape={
        <svg style={{ position: 'absolute', right: -32, top: -24 }} width="200" height="200" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="50" fill={STATUS_SHAPE[tone]} />
        </svg>
      }
    >
      <Stats
        items={[
          { k: 'where', v: where },
          { k: 'last seen', ...(status.minutes_since_update == null ? { v: '—' } : dur(status.minutes_since_update)) },
          { k: 'need a look', v: status.needs_attention_count || 0 },
        ]}
      />
      <p className="mt-6 max-w-[320px] text-[13px] leading-relaxed text-ink/75">{line}</p>
    </Block>
  );
}

function DayBlock({ moments, segments, now, dayStart }) {
  const nowH = new Date(now).getHours();
  // Minutes of activity per hour, and whether the hour held a meal or a walk (the moments worth marking).
  const hours = HOURS.map((h) => {
    const a = dayStart + h * 3600000;
    const b = a + 3600000;
    let active = 0;
    let marked = false;
    for (const s of segments) {
      const o = Math.max(0, Math.min(b, s.end) - Math.max(a, s.start));
      if (!o) continue;
      if (s.category !== 'other') active += o / 60000;
      if (s.category === 'meal' || s.category === 'out') marked = true;
    }
    return { h, active, marked, future: h > nowH };
  });
  const sum = (cat) =>
    segments.filter((s) => s.category === cat).reduce((t, s) => t + (s.end - s.start) / 60000, 0);
  const meals = moments.filter((m) => m.kind === 'activity' && m.category === 'meal').length;
  return (
    <Block
      tour="day"
      to="/log"
      tone="bg-butter"
      title="The day so far"
      shape={
        <svg style={{ position: 'absolute', right: -20, top: -26, opacity: 0.7 }} width="170" height="170" viewBox="0 0 100 100">
          <path d="M35 0h30v35h35v30H65v35H35V65H0V35h35z" fill="#E2BE45" />
        </svg>
      }
    >
      <Stats
        items={[
          { k: 'meals & drinks', v: meals },
          { k: 'resting', ...dur(sum('rest')) },
          { k: 'out walking', ...dur(sum('out')) },
        ]}
      />
      <div className="mt-5 flex h-[92px] items-end justify-between gap-1">
        {hours.map((x) => (
          <span
            key={x.h}
            title={`${x.h}:00`}
            className={cx(
              'w-[7px] rounded-full',
              x.future ? 'border-[1.5px] border-dashed border-ink/35' : x.marked ? 'bg-ink' : 'bg-ink/20'
            )}
            style={{ height: x.future ? `${30 + ((x.h * 37) % 40)}%` : `${Math.max(8, Math.min(100, (x.active / 60) * 100))}%` }}
          />
        ))}
      </div>
      <div className="relative mt-2 h-3 text-[10px] text-ink/60">
        <span className="absolute left-0">6 am</span>
        {nowH > 7 && nowH < 21 && (
          <span className="absolute -translate-x-1/2" style={{ left: `${((nowH - 6 + 0.5) / HOURS.length) * 100}%` }}>now</span>
        )}
        <span className="absolute right-0">10 pm</span>
      </div>
    </Block>
  );
}

function MemoryBlock({ quiz, dayStart }) {
  const today = quiz.filter((q) => new Date(q.date).getTime() >= dayStart);
  const right = (qs) => qs.filter((q) => q.attempts?.some((a) => a.correct)).length;
  const answered = (qs) => qs.filter((q) => q.attempts?.length).length;
  const week = quiz.filter((q) => new Date(q.date).getTime() >= dayStart - 6 * 86400000);
  const rate = answered(week) ? Math.round((right(week) / answered(week)) * 100) : null;
  const last = [...today].reverse().find((q) => q.attempts?.length);
  const a = last?.attempts?.[last.attempts.length - 1];
  return (
    <Block
      tour="memory"
      to="/memory"
      tone="bg-rose"
      title="Memory"
      shape={
        <svg style={{ position: 'absolute', right: -12, bottom: -44 }} width="150" height="150" viewBox="0 0 100 100">
          <path d="M50 88S8 62 8 34a20 20 0 0 1 42-8 20 20 0 0 1 42 8c0 28-42 54-42 54z" fill="#E79AB9" />
        </svg>
      }
    >
      <Stats
        items={[
          { k: "today's quiz", v: today.length ? `${right(today)} / ${today.length}` : '—' },
          { k: 'this week', v: rate == null ? '—' : `${rate}%` },
        ]}
      />
      <p className="mt-5 max-w-[300px] text-[13px] leading-relaxed text-ink/75">
        {last
          ? `${a.correct ? 'Remembered' : 'Not quite'}: “${last.question}”`
          : today.length
            ? 'Today’s questions are waiting on the phone.'
            : 'No quiz yet today. It’s made from the day’s activity.'}
      </p>
    </Block>
  );
}

function PlacesBlock({ status, zones, moments }) {
  const outsideMin = moments
    .filter((m) => m.kind === 'place' && !m.inside)
    .reduce((t, m) => t + Math.max(m.end - m.start, 5 * 60000) / 60000, 0);
  const places = moments.filter((m) => m.kind === 'place');
  const lastMove = places[places.length - 1];
  return (
    <Block
      tour="places"
      to="/places"
      tone="bg-sky"
      title="Places"
      shape={
        <svg style={{ position: 'absolute', right: -28, bottom: -40 }} width="170" height="170" viewBox="0 0 100 100">
          <path d="M50 0l11 27 28-10-10 28 21 15-28 6 3 29-25-15-25 15 3-29L0 60l21-15L11 17l28 10z" fill="#93ABDB" />
        </svg>
      }
    >
      <Stats
        items={[
          { k: 'safe places', v: zones.length },
          { k: 'outside today', ...dur(outsideMin) },
        ]}
      />
      <p className="mt-5 max-w-[300px] text-[13px] leading-relaxed text-ink/75">
        {lastMove ? `${lastMove.title} at ${formatTime(lastMove.start)}.` : status.location?.zone_name ? `At ${status.location.zone_name} all day.` : 'No location readings yet today.'}
      </p>
    </Block>
  );
}

// ---- moments: a list on the left, the chosen one opened on the right ----------------------

const MOMENT_TONE = { meal: 'bg-sky', rest: 'bg-rose', leisure: 'bg-butter', out: 'bg-sage', unseen: 'bg-coral', other: 'bg-[#E2D8C5]' };
const MOMENT_ICON = { meal: 'clock', rest: 'home', leisure: 'heart', out: 'walk', unseen: 'warning', other: 'dot' };

function momentTone(m) {
  if (m.flagged) return 'bg-coral';
  if (m.kind === 'place') return m.inside ? 'bg-sage' : 'bg-coral';
  if (m.kind === 'vitals') return 'bg-coral';
  return MOMENT_TONE[m.category] || 'bg-[#E2D8C5]';
}
function momentIcon(m) {
  if (m.kind === 'place') return 'pin';
  if (m.kind === 'vitals') return 'heartPulse';
  return MOMENT_ICON[m.category] || 'dot';
}

function MomentDetail({ m }) {
  const [broken, setBroken] = useState(false);
  const url = m.image && buildCloudinaryUrl(m.image);
  const mins = Math.round((m.end - m.start) / 60000);
  return (
    <div className={cx('min-w-0 rounded-[22px] p-5 text-[13px] sm:rounded-tl-none', momentTone(m))}>
      <p className="text-[15px] font-semibold">{m.title}</p>
      <p className="mt-0.5 text-[12px] text-ink/70">
        {formatTime(m.start)}
        {mins >= 2 && ` – ${formatTime(m.end)} · ${mins} min`}
      </p>
      {m.objects?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {m.objects.slice(0, 5).map((o) => (
            <span key={o} className="rounded-full bg-black/[0.08] px-2.5 py-1 text-[11px]">{o}</span>
          ))}
        </div>
      )}
      <dl className="mt-4 grid grid-cols-[96px_1fr] gap-x-2 gap-y-2.5">
        {m.detail && (
          <>
            <dt className="text-ink/60">Camera saw</dt>
            <dd>{m.detail}</dd>
          </>
        )}
        {m.count > 1 && (
          <>
            <dt className="text-ink/60">Readings</dt>
            <dd>{m.count} {m.countLabel || 'photos'}</dd>
          </>
        )}
        {m.confidence != null && (
          <>
            <dt className="text-ink/60">Confidence</dt>
            <dd>{m.confidence >= 0.8 ? 'High' : m.confidence >= 0.6 ? 'Fair' : 'Unsure — worth a look'}</dd>
          </>
        )}
      </dl>
      {url && !broken ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img
            src={url.replace('/upload/', '/upload/c_fill,w_720,h_300,q_auto/')}
            alt=""
            onError={() => setBroken(true)}
            className="mt-4 h-[150px] w-full rounded-2xl object-cover"
          />
        </a>
      ) : (
        <div className="mt-4 grid h-[110px] place-items-center rounded-2xl bg-black/[0.06] text-[12px] text-ink/55">
          {m.kind === 'activity' ? 'No photo kept for this moment' : 'Location reading — see Places for the map'}
        </div>
      )}
    </div>
  );
}

function Moments({ moments }) {
  const list = [...moments].reverse().slice(0, 8);
  const [sel, setSel] = useState(0);
  const chosen = list[Math.min(sel, list.length - 1)];
  return (
    <section data-tour="moments">
      <header className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Moments</h2>
        <Link to="/log" className="rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-medium text-white">
          Full log
        </Link>
      </header>
      {!list.length ? (
        <div className="grid min-h-[180px] place-items-center rounded-[22px] bg-paper p-6 text-center">
          <div>
            <p className="font-semibold">Nothing recorded yet today</p>
            <p className="mt-1 text-sm text-ink-3">Moments from the camera and watch show up here as they happen.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:gap-0">
          <ul className="min-w-0 space-y-2">
            {list.map((m, i) => {
              const on = i === sel;
              return (
                <li key={`${m.kind}-${m.start}`}>
                  <button
                    type="button"
                    onClick={() => setSel(i)}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition',
                      on ? cx(momentTone(m), 'sm:-mr-0 sm:rounded-r-none') : 'bg-paper hover:bg-[#E9E0CF]'
                    )}
                  >
                    <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', on ? 'bg-white' : momentTone(m))}>
                      <Icon name={momentIcon(m)} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{m.title}</span>
                      <span className="block truncate text-[11px] text-ink/60">
                        {m.kind === 'activity' ? (m.detail || 'Camera') : m.kind === 'place' ? 'Location' : 'Watch'}
                      </span>
                    </span>
                    <span className={cx('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold', on ? 'bg-white' : momentTone(m))}>
                      {formatTime(m.start)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {chosen && <MomentDetail m={chosen} />}
        </div>
      )}
    </section>
  );
}

// ---- right rail ---------------------------------------------------------------------------

function Week({ now }) {
  const days = Array.from({ length: 7 }, (_, i) => now - (6 - i) * 86400000);
  return (
    <div data-tour="week">
      <p className="mb-3 text-center">
        <span className="rounded-full bg-rose px-3.5 py-1 text-[13px]">
          {new Date(now).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </span>
      </p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((t, i) => {
          const today = i === 6;
          return (
            <Link key={t} to={today ? '/log' : `/log?day=${dayKey(t)}`} className="group">
              <span className="block text-[10px] uppercase text-ink-3">
                {new Date(t).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2)}
              </span>
              <span
                className={cx(
                  'mx-auto mt-1 grid aspect-square w-full max-w-[40px] place-items-center rounded-full text-[13px] transition',
                  today ? 'bg-rose font-bold' : 'group-hover:bg-paper'
                )}
              >
                {new Date(t).getDate()}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function DeviceLine({ icon, name, last, now }) {
  const mins = last ? Math.floor((now - last) / 60000) : null;
  const tone = mins == null ? 'neutral' : mins <= STALE_MIN ? 'ok' : 'watch';
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-surface">
        <Icon name={icon} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold">{name}</span>
        <span className="block text-[11px] text-ink-3">{last ? `Heard ${timeAgo(last, now)}` : 'Nothing today'}</span>
      </span>
      <StatusDot tone={tone} />
    </li>
  );
}

// ---- page ---------------------------------------------------------------------------------

const TOUR = [
  { target: 'status', key: 'Start here', color: '#A3B57A', title: 'Is {name} okay?', body: 'Green means nothing needs you. If something does, this card turns amber or red and says what happened.' },
  { target: 'day', key: 'The day', color: '#F2D46B', title: 'The day at a glance', body: 'One bar per hour. Black bars held a meal or a walk; dashed ones are the rest of today, still to come.' },
  { target: 'memory', key: 'Memory', color: '#F2B8CF', title: 'How {name}’s memory is doing', body: 'Today’s quiz and the week so far. Tap the card for every question and answer.' },
  { target: 'places', key: 'Places', color: '#B3C6EA', title: 'Where {name} went', body: 'The safe places and any time spent outside them. Tap to draw or move a safe place.' },
  { target: 'moments', key: 'Moments', color: '#B3C6EA', title: 'What the camera saw', body: '{name}’s day, newest first. Pick a moment to see the photo and what the camera made of it.' },
  { target: 'week', key: 'Other days', color: '#F2B8CF', title: 'Look back', body: 'Tap any day this week to open its full log.' },
  { target: 'camera', key: 'Right now', color: '#A3B57A', title: 'The latest photo', body: 'The most recent photo from the home camera. That’s the tour — the ? button brings it back any time.' },
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
    };
  }, [entries.data, zones.data, dayStart, dayEnd, now]);

  if (status.isLoading || entries.isLoading) return <Loading label="Reading today" />;
  if (status.isError) return <ErrorNote error={status.error} />;

  const s = status.data;
  const name = s.patient?.name || 'Your person';
  const outside = s.location?.inside_safe_zone === false;
  const tone = d.open.some((i) => !i.resolved) ? 'act' : d.open.length || s.is_stale || outside ? 'watch' : 'ok';
  const firstName = user?.name?.split(' ')[0];
  const where = s.location?.zone_name
    ? s.location.zone_name.toLowerCase() === 'home'
      ? `${name} is at home`
      : `${name} is at ${s.location.zone_name}`
    : outside
      ? `${name} is outside the safe places`
      : `${name}'s location isn't known yet`;
  const summary = daySummary(name, d.moments, d.todaysIncidents);
  const loc = s.location;
  const current = loc?.lat != null ? { lat: loc.lat, lng: loc.lng } : null;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <h1 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[40px]">
          {greeting(new Date(now).getHours())}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-ink-2">
          {where}
          {s.last_update && !s.is_stale ? `, last seen ${timeAgo(s.last_update, now)}` : ''}.{' '}
          {tone === 'ok' ? 'Nothing needs you right now.' : ''} {summary}
        </p>

        {d.open.length > 0 && (
          <div className="mt-5 space-y-2 rounded-[22px] bg-coral/40 p-2.5">
            {d.open.map((i) => (
              <IncidentCard key={i.id} incident={i} showDate={i.start < dayStart} embedded />
            ))}
          </div>
        )}

        <div className="mt-6 grid gap-3.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <StatusBlock status={s} tone={tone} incidents={d.open} now={now} />
          <DayBlock moments={d.moments} segments={d.segments} now={now} dayStart={dayStart} />
        </div>
        <div className="mt-3.5 grid gap-3.5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <MemoryBlock quiz={quiz.data || []} dayStart={dayStart} />
          <PlacesBlock status={s} zones={zones.data || []} moments={d.moments} />
        </div>

        <div className="mt-8">
          <Moments moments={d.moments} />
        </div>
      </div>

      <aside className="min-w-0 space-y-6">
        <Week now={now} />
        <Link to="/log" className="block rounded-full bg-ink py-3 text-center text-[14px] font-medium text-white">
          Open today’s full log
        </Link>
        <div data-tour="camera">
          <h2 className="mb-3 px-1 text-[19px] font-semibold tracking-[-0.01em]">Right now</h2>
          <CameraWindow entries={entries.data} now={now} />
        </div>
        <div>
          <h2 className="mb-3 flex items-center justify-between px-1 text-[19px] font-semibold tracking-[-0.01em]">
            Where {name.split(' ')[0]} went
            <Link to="/places" className="text-[12px] font-medium text-ink-3 hover:text-ink">Edit places</Link>
          </h2>
          <div className="overflow-hidden rounded-[22px]">
            <ZoneMap zones={zones.data || []} path={d.path} current={current} interactive={false} style={{ height: 220 }} />
          </div>
        </div>
        <div>
          <h2 className="mb-3 px-1 text-[19px] font-semibold tracking-[-0.01em]">Devices</h2>
          <ul className="min-w-0 space-y-2">
            <DeviceLine icon="camera" name="Home camera" last={d.lastCamera} now={now} />
            <DeviceLine icon="watch" name="Watch & phone" last={d.lastWatch} now={now} />
          </ul>
        </div>
      </aside>

      <Tour id="today-v1" steps={TOUR} who={firstName} name={name.split(' ')[0]} />
    </div>
  );
}
