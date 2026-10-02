import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useEntries, useNow, useQuizHistory, useStatus, useZones } from '../lib/hooks.js';
import { buildIncidents, buildMoments, dayBounds, daySummary, ribbonSegments } from '../lib/story.js';
import { formatTime, timeAgo } from '../utils/datetime.js';
import DayRibbon from '../components/DayRibbon.jsx';
import ZoneMap from '../components/ZoneMap.jsx';
import MomentList from '../components/MomentList.jsx';
import IncidentCard from '../components/IncidentCard.jsx';
import { Badge, Button, Empty, ErrorNote, Icon, Loading, Panel, StatusDot, cx } from '../ui';

const STALE_MIN = 45;

function greeting(h) {
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function whereLine(name, loc) {
  if (!loc) return `${name}'s location is unknown`;
  if (loc.zone_name) {
    return loc.zone_name.toLowerCase() === 'home' ? `${name} is at home` : `${name} is at ${loc.zone_name}`;
  }
  if (loc.inside_safe_zone === false) return `${name} is outside the safe zones`;
  return `${name}'s location is unknown`;
}

function Hero({ status, openIncident, openCount, summary, now }) {
  const name = status.patient?.name || 'Your person';
  const stale = status.is_stale;
  const tone = openIncident && !openIncident.resolved ? 'act' : openIncident || stale ? 'watch' : 'ok';
  const verdict = {
    ok: 'Everything looks normal',
    watch: openIncident ? 'Back safe — worth a look' : 'Devices have gone quiet',
    act: 'Needs your attention',
  }[tone];

  return (
    <section
      className={cx(
        'relative overflow-hidden rounded-lg border bg-surface',
        tone === 'act' ? 'border-act-line' : tone === 'watch' ? 'border-watch-line' : 'border-line'
      )}
    >
      <div
        className={cx(
          'absolute inset-y-0 left-0 w-1.5',
          tone === 'act' ? 'bg-act' : tone === 'watch' ? 'bg-watch' : 'bg-ok'
        )}
      />
      <div className="flex flex-wrap items-center justify-between gap-6 py-6 pl-8 pr-6">
        <div className="min-w-0">
          <p
            className={cx(
              'mb-2 flex items-center gap-2 text-sm font-bold',
              tone === 'act' ? 'text-act' : tone === 'watch' ? 'text-watch' : 'text-ok'
            )}
          >
            <StatusDot tone={tone} pulse={tone !== 'ok'} /> {verdict}
          </p>
          <h1 className="text-3xl font-bold tracking-[-0.02em] text-ink">
            {whereLine(name, status.location)}.
          </h1>
          <p className="mt-2 text-lg text-ink-2">
            {stale ? (
              <>
                No update from the camera or watch for{' '}
                <strong className="font-semibold">{timeAgo(status.last_update, now).replace(' ago', '')}</strong>.
                Check the devices are on and connected.
              </>
            ) : (
              <>
                Last seen <strong className="font-semibold">{timeAgo(status.last_update, now)}</strong>
                {status.current_activity && <> — {status.current_activity.toLowerCase()}</>}.
              </>
            )}
          </p>
          {summary && <p className="mt-4 max-w-3xl text-md leading-relaxed text-ink-3">{summary}</p>}
        </div>
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line text-center">
          {[
            { k: 'Logged today', v: status.today?.entry_count ?? 0 },
            {
              k: 'Quiz',
              v: status.today?.quiz_total ? `${status.today.quiz_correct}/${status.today.quiz_total}` : '—',
            },
            { k: openCount === 1 ? 'Open incident' : 'Open incidents', v: openCount, act: openCount > 0 },
          ].map((s) => (
            <div key={s.k} className="min-w-[104px] bg-surface px-4 py-3">
              <dd className={cx('text-2xl font-bold', s.act ? 'text-act' : 'text-ink')}>{s.v}</dd>
              <dt className="text-xs font-semibold text-ink-3">{s.k}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function DeviceRow({ icon, name, last, now }) {
  const mins = last ? Math.floor((now - last) / 60000) : null;
  const tone = mins == null ? 'neutral' : mins <= STALE_MIN ? 'ok' : 'watch';
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="grid h-8 w-8 place-items-center rounded bg-subtle text-ink-2">
        <Icon name={icon} size={17} />
      </span>
      <div className="flex-1">
        <p className="font-semibold">{name}</p>
        <p className="text-sm text-ink-3">{last ? `Last heard ${timeAgo(last, now)}` : 'Nothing today'}</p>
      </div>
      <StatusDot tone={tone} />
    </li>
  );
}

function QuizToday({ questions }) {
  if (!questions.length) {
    return <p className="text-sm text-ink-3">No quiz yet today. It's generated from the day's activity.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {questions.map((q) => {
        const a = q.attempts?.[q.attempts.length - 1];
        return (
          <li key={q.id} className="flex items-start gap-3 py-2.5">
            <span
              className={cx(
                'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-white',
                !a ? 'bg-line-strong' : a.correct ? 'bg-ok' : 'bg-watch'
              )}
            >
              <Icon name={!a ? 'dot' : a.correct ? 'check' : 'x'} size={12} strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <p className="text-base text-ink">{q.question}</p>
              <p className="text-sm text-ink-3">
                {!a ? 'Not answered yet' : a.correct ? `Remembered: “${a.answered}”` : `Said “${a.answered}” — it was ${q.correctAnswer.toLowerCase()}`}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function Today() {
  const { user } = useAuth();
  const now = useNow();
  const [dayStart, dayEnd] = dayBounds();
  const weekAgo = dayStart - 7 * 86400000;

  const status = useStatus();
  const entries = useEntries({ from: weekAgo });
  const zones = useZones();
  const quiz = useQuizHistory();

  const derived = useMemo(() => {
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
      .map((e) => ({
        lat: e.payload.lat,
        lng: e.payload.lng,
        flagged: e.requiresAttention,
        label: formatTime(e.timestamp),
      }));
    const lastOf = (pred) => {
      const hit = todays.filter(pred).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      return hit ? new Date(hit.timestamp).getTime() : null;
    };
    return {
      moments,
      todaysIncidents,
      olderOpen,
      path,
      segments: ribbonSegments(moments, dayStart, dayEnd, now),
      lastCamera: lastOf((e) => e.entryType === 'frame'),
      lastWatch: lastOf((e) => e.entryType !== 'frame'),
    };
  }, [entries.data, zones.data, dayStart, dayEnd, now]);

  const todaysQuiz = (quiz.data || []).filter((q) => new Date(q.date).getTime() >= dayStart);

  if (status.isLoading || entries.isLoading) return <Loading label="Reading today" />;
  if (status.isError) return <ErrorNote error={status.error} />;

  const openIncident = [...derived.todaysIncidents, ...derived.olderOpen].find((i) => !i.acknowledged);
  const loc = status.data?.location;
  const current = loc?.lat != null ? { lat: loc.lat, lng: loc.lng } : null;
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-md text-ink-3">
          {greeting(new Date(now).getHours())}
          {firstName ? `, ${firstName}` : ''} ·{' '}
          {new Date(now).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-ink-4">
          <Icon name="refresh" size={13} /> Updates every 30 seconds
        </p>
      </div>

      <Hero
        status={status.data}
        openIncident={openIncident}
        openCount={[...derived.todaysIncidents, ...derived.olderOpen].filter((i) => !i.acknowledged).length}
        summary={daySummary(status.data.patient?.name || 'they', derived.moments, derived.todaysIncidents)}
        now={now}
      />

      {[...derived.olderOpen, ...derived.todaysIncidents]
        .filter((i) => !i.acknowledged)
        .map((i) => (
          <IncidentCard key={i.id} incident={i} showDate={i.start < dayStart} />
        ))}

      <Panel
        title="Today at a glance"
        action={
          <Link to="/log" className="text-sm font-semibold text-accent hover:underline">
            Full log
          </Link>
        }
      >
        <div className="pt-6">
          <DayRibbon
            segments={derived.segments}
            incidents={derived.todaysIncidents}
            dayStart={dayStart}
            now={now}
          />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Panel
          title="The day so far"
          action={<span className="text-sm text-ink-3">{derived.moments.length} moments, newest first</span>}
        >
          {derived.moments.length ? (
            <MomentList moments={derived.moments} />
          ) : (
            <Empty icon="clock" title="Nothing recorded yet today">
              Activity from the camera and watch shows up here as it happens.
            </Empty>
          )}
          {derived.todaysIncidents.some((i) => i.acknowledged) && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="section-title mb-2">Handled today</p>
              <div className="space-y-2">
                {derived.todaysIncidents
                  .filter((i) => i.acknowledged)
                  .map((i) => (
                    <IncidentCard key={i.id} incident={i} compact />
                  ))}
              </div>
            </div>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel
            title={`Where ${status.data?.patient?.name || 'they'} went today`}
            flush
            action={
              <Link to="/places" className="text-sm font-semibold text-accent hover:underline">
                Edit places
              </Link>
            }
          >
            <ZoneMap
              zones={zones.data || []}
              path={derived.path}
              current={current}
              interactive={false}
              style={{ height: 300 }}
              className="rounded-b-md"
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-xs text-ink-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-accent" /> Now
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-ink" /> Location ping
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-act" /> Outside safe zones
              </span>
            </div>
          </Panel>

          <Panel
            title="Memory quiz"
            action={
              todaysQuiz.length > 0 && (
                <Badge tone="neutral">
                  {todaysQuiz.filter((q) => q.attempts?.some((a) => a.correct)).length}/{todaysQuiz.length} remembered
                </Badge>
              )
            }
          >
            <QuizToday questions={todaysQuiz} />
          </Panel>

          <Panel title="Devices">
            <ul className="-my-2.5 divide-y divide-line">
              <DeviceRow icon="camera" name="Home camera" last={derived.lastCamera} now={now} />
              <DeviceRow icon="watch" name="Watch & phone location" last={derived.lastWatch} now={now} />
            </ul>
            <Link to="/settings" className="mt-3 inline-block">
              <Button size="sm" variant="ghost" icon="plus">
                Add a device
              </Button>
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}

