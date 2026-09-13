import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchLogEntries } from '../api/logEntries';
import { fetchGeofenceZones } from '../api/geofenceZones';
import { fetchPatientStatus } from '../api/status';
import { buildCloudinaryUrl } from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import LogEntryCard from '../components/LogEntryCard.jsx';
import { PageHeader, Panel, Chip, Icon, Button, Skeleton, ErrorBanner, EmptyState } from '../ui';
import { formatTime, timeAgo } from '../utils/datetime.js';
import { extractInsideSafeZone } from '../utils/geo.js';

// This is the front door: the screen a worried family member opens twenty
// times a day. Everything on it answers one question — is she okay right
// now — and the status band + stat tiles come straight from the server's
// /api/patients/:id/status endpoint, which already knows staleness, current
// activity, zone containment and the day's attention count. Grouping today's
// log entries into episodes for the spine below is a view concern and stays
// client-side, computed from the same log-entries query Timeline/Alerts use.

const EPISODE_GAP_MS = 45 * 60 * 1000;
const EPISODE_MAX_SPAN_MS = 3 * 60 * 60 * 1000;
const EPISODE_DISPLAY_CAP = 8;
const MAX_EXPANDED_ENTRIES = 20;

// Common irregular verbs that show up in activity phrases ("sitting in the
// living room", "having a cup of tea") — the regular strip-ing-add-ed
// fallback below gets these wrong ("sitted", "haved").
const IRREGULAR_PAST = {
  sitting: 'sat', standing: 'stood', sleeping: 'slept', eating: 'ate', drinking: 'drank',
  having: 'had', taking: 'took', making: 'made', going: 'went', doing: 'did', seeing: 'saw',
  getting: 'got', giving: 'gave', reading: 'read', writing: 'wrote', speaking: 'spoke',
  waking: 'woke', wearing: 'wore', coming: 'came', running: 'ran', lying: 'lay',
  holding: 'held', keeping: 'kept', feeling: 'felt', leaving: 'left', meeting: 'met',
  thinking: 'thought',
};

const TYPE_ICONS = { frame: 'camera', geofence: 'pin', heartrate: 'heart', quiz: 'spark' };
const TYPE_LABELS = { frame: 'Camera', geofence: 'Location', heartrate: 'Heart rate', quiz: 'Quiz' };

const LEVEL_LABEL = {
  calm: 'All quiet',
  away: 'Away from safe zones',
  alert: 'Needs attention',
  stale: 'No recent update',
  unknown: 'No data yet',
};

const STATUS_STYLES = {
  calm: { bg: 'bg-sage-50', border: 'border-line-sage', icon: 'check', iconBg: 'bg-sage-100', iconTone: 'text-sage-700' },
  away: { bg: 'bg-attend-bg', border: 'border-attend-line', icon: 'pin', iconBg: 'bg-surface', iconTone: 'text-attend-fg' },
  alert: { bg: 'bg-alert-bg', border: 'border-alert-line', icon: 'warning', iconBg: 'bg-surface', iconTone: 'text-alert-fg' },
  stale: { bg: 'bg-attend-bg', border: 'border-attend-line', icon: 'clock', iconBg: 'bg-surface', iconTone: 'text-attend-fg' },
  unknown: { bg: 'bg-info-bg', border: 'border-info-line', icon: 'info', iconBg: 'bg-surface', iconTone: 'text-info-fg' },
};

// ---- pure helpers -----------------------------------------------------

function sentenceCase(value) {
  if (!value || typeof value !== 'string') return '';
  const cleaned = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function lowerFirst(value) {
  if (!value) return '';
  return value.charAt(0).toLowerCase() + value.slice(1);
}

/** A short, human phrase describing a single log entry. Used in the "needs a
 * look" sidebar and as a fallback episode sentence. */
function describeEntry(entry) {
  const payload = entry?.payload || {};
  switch (entry?.entryType) {
    case 'frame':
      if (typeof payload.activity === 'string' && payload.activity) return sentenceCase(payload.activity);
      if (typeof payload.person_state === 'string' && payload.person_state)
        return `Person ${sentenceCase(payload.person_state)}`;
      return 'Camera activity noticed';
    case 'geofence': {
      const inside = extractInsideSafeZone(payload);
      if (inside === false) return 'Left a safe zone';
      if (inside === true) return 'Inside a safe zone';
      return 'Location update';
    }
    case 'heartrate': {
      const bpm = payload.bpm ?? payload.heart_rate ?? payload.heartRate ?? payload.value;
      return typeof bpm === 'number' ? `Heart rate ${bpm} bpm` : 'Heart rate reading';
    }
    case 'quiz':
      return 'Daily quiz activity';
    default:
      return TYPE_LABELS[entry?.entryType] || 'Update';
  }
}

/** Groups a day's entries (must be sorted oldest-first) into episodes.
 * Consecutive entries that share the same `frame` activity always merge into
 * one episode regardless of the gap between them, up to a 3-hour span cap —
 * past that, a fresh episode starts so "sitting in the living room" across a
 * whole day doesn't collapse into one meaningless block. Anything else — a
 * changed activity, or entries with no comparable activity to compare — only
 * splits once more than 45 minutes separate them; the camera's ~20-minute
 * cadence means back-to-back frames of the same activity should almost never
 * be split by time alone. A flagged (`requiresAttention`) entry always gets
 * an episode of its own: it can never be absorbed into a calm-sounding
 * summary, and whatever follows it always starts a fresh episode too. */
function groupIntoEpisodes(entries) {
  const episodes = [];
  let current = null;

  for (const entry of entries) {
    const ts = new Date(entry.timestamp).getTime();
    if (Number.isNaN(ts)) continue;
    const activity =
      entry.entryType === 'frame' && typeof entry.payload?.activity === 'string' && entry.payload.activity
        ? entry.payload.activity
        : null;

    if (entry.requiresAttention) {
      if (current) {
        episodes.push(current);
        current = null;
      }
      episodes.push({ id: entry.id, startTs: ts, endTs: ts, activity, hasAttention: true, entries: [entry] });
      continue;
    }

    if (current) {
      const sameActivity = Boolean(current.activity && activity && activity === current.activity);
      const activityChanged = Boolean(current.activity && activity && activity !== current.activity);
      const split = sameActivity
        ? ts - current.startTs > EPISODE_MAX_SPAN_MS
        : activityChanged || ts - current.endTs > EPISODE_GAP_MS;

      if (split) {
        episodes.push(current);
        current = null;
      }
    }
    if (!current) {
      current = { id: entry.id, startTs: ts, endTs: ts, activity, hasAttention: false, entries: [] };
    }
    current.endTs = ts;
    if (activity) current.activity = activity;
    current.entries.push(entry);
  }
  if (current) episodes.push(current);

  return episodes.map((ep) => {
    const geofenceStates = ep.entries
      .filter((e) => e.entryType === 'geofence')
      .map((e) => extractInsideSafeZone(e.payload));
    return {
      ...ep,
      durationMs: ep.endTs - ep.startTs,
      outsideZones: geofenceStates.length > 0 && geofenceStates.every((v) => v === false),
      imagePublicId:
        ep.entries.find((e) => e.entryType === 'frame' && e.imagePublicId)?.imagePublicId || null,
      typeCounts: ep.entries.reduce((acc, e) => {
        acc[e.entryType] = (acc[e.entryType] || 0) + 1;
        return acc;
      }, {}),
    };
  });
}

function pastTenseWord(word) {
  const lower = word.toLowerCase();
  if (IRREGULAR_PAST[lower]) return IRREGULAR_PAST[lower];
  if (lower.endsWith('ing') && lower.length > 4) {
    let stem = lower.slice(0, -3);
    const last = stem[stem.length - 1];
    const secondLast = stem[stem.length - 2];
    if (stem.length >= 3 && last === secondLast && !'aeiou'.includes(last)) {
      stem = stem.slice(0, -1);
    }
    return `${stem}ed`;
  }
  return lower;
}

/** Converts a gerund activity phrase ("sitting in the living room") to a
 * past-tense sentence opener ("Sat in the living room"), for episodes long
 * enough to describe as something that happened rather than something
 * ongoing. */
function activityPastTense(activity) {
  const cleaned = activity.replace(/[_-]+/g, ' ').trim().toLowerCase();
  if (!cleaned) return '';
  const [first, ...rest] = cleaned.split(' ');
  const phrase = [pastTenseWord(first), ...rest].join(' ');
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

/** Round, human duration phrasing for an episode span — "about 40 minutes",
 * "just under an hour", "over 2 hours" — never a raw "1h 37m" or minute
 * count past the point it stops being meaningful. */
function humanDuration(ms) {
  const minutes = ms / 60000;
  if (minutes < 60) {
    const rounded = Math.max(5, Math.round(minutes / 5) * 5);
    return `about ${rounded} minutes`;
  }
  const hours = minutes / 60;
  if (hours < 2) {
    if (hours >= 1.75) return 'just under 2 hours';
    if (hours >= 1.4) return 'about an hour and a half';
    if (hours >= 1.15) return 'over an hour';
    if (hours >= 0.92) return 'about an hour';
    return 'just under an hour';
  }
  const wholeHours = Math.floor(hours);
  return `over ${wholeHours} hour${wholeHours === 1 ? '' : 's'}`;
}

function describeEpisode(episode) {
  if (episode.activity) {
    const minutes = episode.durationMs / 60000;
    if (minutes < 10) return sentenceCase(episode.activity);
    return `${activityPastTense(episode.activity)} for ${humanDuration(episode.durationMs)}`;
  }
  if (episode.typeCounts.geofence) {
    if (episode.outsideZones) return 'Left the safe zones';
    const lastGeofence = [...episode.entries].reverse().find((e) => e.entryType === 'geofence');
    const inside = extractInsideSafeZone(lastGeofence?.payload);
    if (inside === true) return 'Checked in from a safe zone';
    return 'Location checked in';
  }
  if (episode.typeCounts.heartrate) {
    return episode.entries.length > 1 ? `Heart rate checked ${episode.entries.length} times` : 'Heart rate checked';
  }
  if (episode.typeCounts.quiz) return 'Daily quiz activity';
  return describeEntry(episode.entries[episode.entries.length - 1]);
}

function splitElapsedMinutes(minutes) {
  if (minutes === null || minutes === undefined) return { value: '—', qualifier: 'no data' };
  if (minutes < 1) return { value: '0', qualifier: 'just now' };
  if (minutes < 60) return { value: String(minutes), qualifier: minutes === 1 ? 'minute ago' : 'minutes ago' };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { value: String(hours), qualifier: hours === 1 ? 'hour ago' : 'hours ago' };
  const days = Math.floor(hours / 24);
  return { value: String(days), qualifier: days === 1 ? 'day ago' : 'days ago' };
}

function statusHeadline(level, { patientName, needsAttentionCount, staleAgo, zoneName }) {
  switch (level) {
    case 'calm':
      if (!patientName) return zoneName ? `They're at ${zoneName.toLowerCase()} right now.` : 'Everything looks normal.';
      return zoneName ? `${patientName} is at ${zoneName.toLowerCase()}.` : `${patientName} is in a safe zone.`;
    case 'away':
      return patientName
        ? `${patientName} is away from their safe zones.`
        : "They're away from their safe zones right now.";
    case 'alert': {
      const count = needsAttentionCount || 0;
      const thing = count === 1 ? 'thing' : 'things';
      return patientName
        ? `${patientName} needs a look — ${count} ${thing} flagged today.`
        : `Something needs a look — ${count} ${thing} flagged today.`;
    }
    case 'stale':
      return patientName ? `No update from ${patientName} in the last ${staleAgo}.` : `No update in the last ${staleAgo}.`;
    default:
      return "We haven't heard anything yet.";
  }
}

// ---- small presentational pieces --------------------------------------

function BandSkeleton() {
  return (
    <div className="rounded-panel border border-line bg-surface-sunken p-7 sm:p-9">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-full max-w-md" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-20 w-20 shrink-0 rounded-pill" />
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-card border border-line bg-surface-sunken p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-3 h-7 w-12" />
          <Skeleton className="mt-2 h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

function SpineSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-10 shrink-0" />
          <Skeleton className="h-3 w-3 shrink-0 rounded-pill" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

function RowsSkeleton({ rows = 2 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-card" />
      ))}
    </div>
  );
}

function StatTile({ label, value, qualifier }) {
  return (
    <Panel className="flex h-full flex-col p-4">
      <p className="min-h-[2.3em] text-[11px] font-bold uppercase leading-[1.15] tracking-[0.09em] text-ink-faint">
        {label}
      </p>
      <p className="mt-2 font-display text-[26px] font-semibold leading-none text-ink">{value}</p>
      <p className="mt-1.5 truncate text-[12.5px] text-ink-faint">{qualifier}</p>
    </Panel>
  );
}

function EpisodeThumb({ imagePublicId }) {
  const [failed, setFailed] = useState(false);
  const url = buildCloudinaryUrl(imagePublicId);
  if (!url || failed) {
    return (
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-card border border-line bg-sage-50 text-sage-400">
        <Icon name="image" size={17} />
      </span>
    );
  }
  return (
    <img
      src={url}
      alt=""
      onError={() => setFailed(true)}
      className="h-14 w-14 shrink-0 rounded-card border border-line object-cover"
    />
  );
}

function EpisodeRow({ episode, isExpanded, onToggle }) {
  return (
    <li className="grid grid-cols-[56px_24px_minmax(0,1fr)] items-start">
      <div className="whitespace-nowrap pr-2 pt-1 text-right text-[12px] font-bold text-ink-faint">
        {formatTime(episode.startTs)}
      </div>
      <div className="relative z-10 flex justify-center pt-1.5">
        <span
          aria-hidden="true"
          className={[
            'h-3 w-3 rounded-pill border-2 border-surface',
            episode.hasAttention ? 'bg-alert-fg' : 'bg-sage',
          ].join(' ')}
        />
      </div>
      <div className="min-w-0 pb-6 pl-3">
        <div className="flex flex-wrap items-start gap-3">
          {episode.imagePublicId && <EpisodeThumb imagePublicId={episode.imagePublicId} />}
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words text-[15px] leading-relaxed text-ink">{describeEpisode(episode)}</p>
              {episode.hasAttention && (
                <Chip tone="alert" dot>
                  Needs a look
                </Chip>
              )}
              {episode.outsideZones && (
                <Chip tone="attend" dot>
                  Outside safe zones
                </Chip>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2.5">
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={onToggle}
                className="inline-flex items-center gap-1 text-[12.5px] font-bold text-sage-700 hover:text-sage-800"
              >
                <Icon name={isExpanded ? 'chevronDown' : 'chevronRight'} size={13} />
                {isExpanded ? 'Hide details' : 'Show details'}
              </button>
              {episode.entries.length > 1 && (
                <span className="text-[12px] text-ink-faint">{episode.entries.length} entries</span>
              )}
            </div>
            {isExpanded && (
              <div className="mt-3 space-y-3">
                {episode.entries.slice(0, MAX_EXPANDED_ENTRIES).map((entry) => (
                  <LogEntryCard key={entry.id} entry={entry} />
                ))}
                {episode.entries.length > MAX_EXPANDED_ENTRIES && (
                  <p className="text-[13px] text-ink-faint">
                    +{episode.entries.length - MAX_EXPANDED_ENTRIES} more entries —{' '}
                    <Link to="/timeline" className="font-bold text-sage-700 hover:text-sage-800">
                      see the full record
                    </Link>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function EpisodeSpine({ episodes, expanded, onToggle }) {
  return (
    <div className="relative">
      <div aria-hidden="true" className="absolute bottom-2 left-[68px] top-2 z-0 w-0.5 bg-line-sage" />
      <ul>
        {episodes.map((episode) => (
          <EpisodeRow
            key={episode.id}
            episode={episode}
            isExpanded={expanded.has(episode.id)}
            onToggle={() => onToggle(episode.id)}
          />
        ))}
      </ul>
    </div>
  );
}

// ---- page ---------------------------------------------------------------

export default function Today() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const patientId = user?.patient_id;

  const [expandedEpisodes, setExpandedEpisodes] = useState(() => new Set());

  function toggleEpisode(id) {
    setExpandedEpisodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const statusQuery = useQuery({
    queryKey: ['patient-status', patientId],
    queryFn: () => fetchPatientStatus(patientId),
    enabled: Boolean(patientId),
  });

  const entriesQuery = useQuery({
    queryKey: ['log-entries', { patientId, type: '', from: '', to: '' }],
    queryFn: () => fetchLogEntries({ patientId }),
    enabled: Boolean(patientId),
  });

  const zonesQuery = useQuery({
    queryKey: ['geofence-zones', patientId],
    queryFn: () => fetchGeofenceZones(patientId),
    enabled: Boolean(patientId),
  });

  const now = Date.now();
  const zones = zonesQuery.data || [];
  const status = statusQuery.data || null;
  const patientName = status?.patient?.name || user?.patient_name || user?.patientName || null;

  const entriesDesc = useMemo(
    () =>
      [...(entriesQuery.data || [])].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [entriesQuery.data]
  );

  const todayEntriesAsc = useMemo(() => {
    const todayKey = new Date().toDateString();
    return entriesDesc
      .filter((e) => {
        const d = new Date(e.timestamp);
        return !Number.isNaN(d.getTime()) && d.toDateString() === todayKey;
      })
      .slice()
      .reverse();
  }, [entriesDesc]);

  const episodesDesc = useMemo(
    () => [...groupIntoEpisodes(todayEntriesAsc)].reverse(),
    [todayEntriesAsc]
  );
  // A flagged episode is the one thing on this screen that needs attention —
  // it must never be capped away. Only ordinary (unflagged) episodes count
  // against the display cap; flagged ones are always shown, in their correct
  // chronological position among whichever ordinary episodes made the cut.
  const { visibleEpisodes, hiddenOrdinaryCount } = useMemo(() => {
    const ordinaryDesc = episodesDesc.filter((ep) => !ep.hasAttention);
    const visibleOrdinaryIds = new Set(ordinaryDesc.slice(0, EPISODE_DISPLAY_CAP).map((ep) => ep.id));
    return {
      visibleEpisodes: episodesDesc.filter((ep) => ep.hasAttention || visibleOrdinaryIds.has(ep.id)),
      hiddenOrdinaryCount: ordinaryDesc.length - visibleOrdinaryIds.size,
    };
  }, [episodesDesc]);

  const needsAttentionCount = status?.needs_attention_count ?? 0;

  const statusLevel = !status || !status.last_update
    ? 'unknown'
    : status.is_stale
    ? 'stale'
    : needsAttentionCount > 0
    ? 'alert'
    : status.location?.inside_safe_zone === false
    ? 'away'
    : 'calm';

  const staleAgo = status?.last_update ? timeAgo(status.last_update, now).replace(/ ago$/, '') : '';
  const headline = statusHeadline(statusLevel, {
    patientName,
    needsAttentionCount,
    staleAgo,
    zoneName: status?.location?.zone_name || null,
  });

  const secondary = status?.current_activity ? `Currently ${status.current_activity}.` : null;

  const zoneChip = status?.location ? (
    <Chip tone={status.location.inside_safe_zone ? 'sage' : 'attend'}>
      <Icon name="shield" size={12} />
      {status.location.inside_safe_zone ? `In ${status.location.zone_name || 'a safe zone'}` : 'Outside known safe zones'}
    </Chip>
  ) : null;

  const style = STATUS_STYLES[statusLevel];

  const lastUpdateParts = splitElapsedMinutes(status ? status.minutes_since_update : null);
  const entryCountToday = status?.today?.entry_count ?? 0;
  const quizTotal = status?.today?.quiz_total ?? 0;
  const quizCorrect = status?.today?.quiz_correct ?? 0;

  const flaggedEntries = useMemo(
    () => [...todayEntriesAsc].reverse().filter((e) => e.requiresAttention && !e.acknowledgedAt),
    [todayEntriesAsc]
  );
  const flaggedPreview = flaggedEntries.slice(0, 3);

  if (!patientId) {
    return (
      <div>
        <PageHeader eyebrow="Right now" title="Today" description="A quick read on how the day is going." />
        <ErrorBanner
          error={{ message: 'No patient is associated with this account.' }}
          label="Missing patient"
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Right now"
        title="Today"
        description="A quick read on how the day is going, at a glance."
        actions={
          <Button variant="ghost" icon="timeline" onClick={() => navigate('/timeline')}>
            Full record
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="today-status-heading">
            <h2 id="today-status-heading" className="sr-only">
              Current status
            </h2>
            {statusQuery.isError ? (
              <div className="space-y-4">
                <ErrorBanner error={statusQuery.error} label="Could not load current status" />
                <Button variant="secondary" icon="refresh" onClick={() => statusQuery.refetch()}>
                  Try again
                </Button>
              </div>
            ) : statusQuery.isLoading ? (
              <BandSkeleton />
            ) : (
              <div
                aria-live="polite"
                className={[
                  'flex flex-col gap-6 rounded-panel border p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9',
                  style.bg,
                  style.border,
                ].join(' ')}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={[
                        'grid h-9 w-9 shrink-0 place-items-center rounded-pill',
                        style.iconBg,
                        style.iconTone,
                      ].join(' ')}
                    >
                      <Icon name={style.icon} size={18} />
                    </span>
                    <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                      {LEVEL_LABEL[statusLevel]}
                    </p>
                  </div>
                  <p className="mt-3 break-words font-display text-[24px] font-semibold leading-[1.2] text-ink sm:text-[30px]">
                    {headline}
                  </p>
                  {secondary && (
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{secondary}</p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    {zoneChip}
                    {statusLevel === 'unknown' && (
                      <Button size="sm" variant="secondary" icon="device" onClick={() => navigate('/devices/register')}>
                        Register a device
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-center gap-1 self-start rounded-pill bg-surface/70 px-6 py-4 text-center shadow-card sm:self-center">
                  <Icon name="clock" size={16} className="text-ink-faint" />
                  <p className="font-display text-[15px] font-semibold text-ink">
                    {status?.last_update ? formatTime(status.last_update) : '—'}
                  </p>
                  <p className="whitespace-nowrap text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    {status?.last_update ? timeAgo(status.last_update, now) : 'no data'}
                  </p>
                </div>
              </div>
            )}
          </section>

          {!statusQuery.isError && (
            <section aria-labelledby="today-stats-heading">
              <h2 id="today-stats-heading" className="sr-only">
                Today at a glance
              </h2>
              {statusQuery.isLoading ? (
                <StatsSkeleton />
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <StatTile
                    label="Activity today"
                    value={String(entryCountToday)}
                    qualifier={entryCountToday === 1 ? 'entry logged' : 'entries logged'}
                  />
                  <StatTile
                    label="Last update"
                    value={lastUpdateParts.value}
                    qualifier={lastUpdateParts.qualifier}
                  />
                  <StatTile
                    label="Quiz today"
                    value={quizTotal > 0 ? `${quizCorrect}/${quizTotal}` : '—'}
                    qualifier={quizTotal > 0 ? 'correct' : 'no quiz yet'}
                  />
                  <StatTile
                    label="Needs a look"
                    value={String(needsAttentionCount)}
                    qualifier={needsAttentionCount === 0 ? 'all clear' : 'flagged'}
                  />
                </div>
              )}
            </section>
          )}

          <section aria-labelledby="today-so-far-heading">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="today-so-far-heading" className="font-display text-[20px] font-semibold text-ink">
                Today so far
              </h2>
              {episodesDesc.length > 0 && (
                <Link
                  to="/timeline"
                  className="shrink-0 text-[13px] font-bold text-sage-700 hover:text-sage-800"
                >
                  See the full record
                </Link>
              )}
            </div>

            {entriesQuery.isError ? (
              <div className="space-y-4">
                <ErrorBanner error={entriesQuery.error} label="Could not load today's activity" />
                <Button variant="secondary" icon="refresh" onClick={() => entriesQuery.refetch()}>
                  Try again
                </Button>
              </div>
            ) : entriesQuery.isLoading ? (
              <SpineSkeleton />
            ) : episodesDesc.length === 0 ? (
              entriesDesc.length === 0 ? (
                <EmptyState
                  icon="camera"
                  label="Nothing recorded yet"
                  hint="Once a device is set up, activity will start showing up here as it happens."
                  action={
                    <Button icon="device" onClick={() => navigate('/devices/register')}>
                      Register a device
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon="camera"
                  label="Nothing recorded yet today"
                  hint="Once something happens today, it will show up here."
                  action={
                    <Button variant="secondary" icon="timeline" onClick={() => navigate('/timeline')}>
                      See earlier days
                    </Button>
                  }
                />
              )
            ) : (
              <>
                <EpisodeSpine
                  episodes={visibleEpisodes}
                  expanded={expandedEpisodes}
                  onToggle={toggleEpisode}
                />
                {hiddenOrdinaryCount > 0 && (
                  <p className="mt-2 text-[13px] text-ink-faint">
                    {hiddenOrdinaryCount} quieter moment{hiddenOrdinaryCount === 1 ? '' : 's'} not shown.{' '}
                    <Link to="/timeline" className="font-bold text-sage-700 hover:text-sage-800">
                      See everything
                    </Link>
                    .
                  </p>
                )}
              </>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section aria-labelledby="needs-a-look-heading">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="needs-a-look-heading" className="font-display text-[17px] font-semibold text-ink">
                Needs a look
              </h2>
              <Link to="/alerts" className="text-[12.5px] font-bold text-sage-700 hover:text-sage-800">
                See all
              </Link>
            </div>
            {entriesQuery.isError ? (
              <Panel className="p-4">
                <p className="text-[13.5px] text-ink-faint">Couldn't load alerts.</p>
                <Button
                  size="sm"
                  variant="ghost"
                  icon="refresh"
                  className="mt-2"
                  onClick={() => entriesQuery.refetch()}
                >
                  Try again
                </Button>
              </Panel>
            ) : entriesQuery.isLoading ? (
              <RowsSkeleton rows={3} />
            ) : flaggedPreview.length === 0 ? (
              <Panel className="flex items-center gap-3 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-ok-bg text-ok-fg">
                  <Icon name="check" size={16} />
                </span>
                <p className="text-[13.5px] text-ink-soft">All clear — nothing flagged right now.</p>
              </Panel>
            ) : (
              <div className="space-y-2">
                {flaggedPreview.map((entry) => (
                  <Link
                    key={entry.id}
                    to="/alerts"
                    className="flex items-center gap-3 rounded-card border border-line bg-surface p-3 transition-colors duration-150 hover:border-line-sage"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-alert-bg text-alert-fg">
                      <Icon name={TYPE_ICONS[entry.entryType] || 'warning'} size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-bold text-ink">
                        {describeEntry(entry)}
                      </span>
                      <span className="block text-[12px] text-ink-faint">{timeAgo(entry.timestamp, now)}</span>
                    </span>
                  </Link>
                ))}
                {flaggedEntries.length > flaggedPreview.length && (
                  <Link
                    to="/alerts"
                    className="block pt-1 text-center text-[12.5px] font-bold text-sage-700 hover:text-sage-800"
                  >
                    +{flaggedEntries.length - flaggedPreview.length} more
                  </Link>
                )}
              </div>
            )}
          </section>

          <section aria-labelledby="safe-zones-heading">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="safe-zones-heading" className="font-display text-[17px] font-semibold text-ink">
                Safe zones
              </h2>
              <Link to="/setup" className="text-[12.5px] font-bold text-sage-700 hover:text-sage-800">
                Manage
              </Link>
            </div>
            {zonesQuery.isError ? (
              <Panel className="p-4">
                <p className="text-[13.5px] text-ink-faint">Couldn't load safe zones.</p>
                <Button
                  size="sm"
                  variant="ghost"
                  icon="refresh"
                  className="mt-2"
                  onClick={() => zonesQuery.refetch()}
                >
                  Try again
                </Button>
              </Panel>
            ) : zonesQuery.isLoading ? (
              <RowsSkeleton rows={2} />
            ) : zones.length === 0 ? (
              <Panel className="p-4 text-center">
                <p className="text-[13.5px] text-ink-soft">No safe zones set up yet.</p>
                <Button
                  size="sm"
                  variant="secondary"
                  icon="plus"
                  className="mt-3"
                  onClick={() => navigate('/geofences')}
                >
                  Add a safe zone
                </Button>
              </Panel>
            ) : (
              <div className="space-y-2">
                {zones.map((zone) => {
                  const isCurrent = Boolean(status?.location?.zone_id && status.location.zone_id === zone.id);
                  return (
                    <div
                      key={zone.id}
                      className="flex items-center gap-3 rounded-card border border-line bg-surface p-3"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-sage-100 text-sage-700">
                        <Icon name="shield" size={15} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-ink">
                        {zone.name}
                      </span>
                      {status?.location ? (
                        <Chip tone={isCurrent ? 'ok' : 'neutral'} dot>
                          {isCurrent ? 'Inside' : 'Outside'}
                        </Chip>
                      ) : (
                        <Chip tone="neutral">No data</Chip>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
