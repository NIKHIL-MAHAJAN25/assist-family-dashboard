import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchLogEntries, updateLogEntryAcknowledged } from '../api/logEntries';
import { useAuth } from '../context/AuthContext.jsx';
import LogEntryCard from '../components/LogEntryCard.jsx';
import { extractInsideSafeZone } from '../utils/geo.js';
import {
  PageHeader,
  Card,
  Chip,
  FilterChip,
  Icon,
  Button,
  LoadingBanner,
  ErrorBanner,
  EmptyState,
} from '../ui';
import { formatDateTime } from '../utils/datetime.js';

const TYPE_ICONS = { frame: 'camera', geofence: 'pin', heartrate: 'heart', quiz: 'spark' };

const VIEWS = { NEEDS_LOOK: 'needs-look', CLEARED: 'cleared' };

function sentenceCase(value) {
  if (!value || typeof value !== 'string') return '';
  const cleaned = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function describeAlertEntry(entry) {
  const payload = entry?.payload || {};
  switch (entry?.entryType) {
    case 'frame':
      if (typeof payload.activity === 'string' && payload.activity) return sentenceCase(payload.activity);
      return 'Camera activity flagged';
    case 'geofence': {
      const inside = extractInsideSafeZone(payload);
      if (inside === false) return 'Left a safe zone';
      if (inside === true) return 'Inside a safe zone';
      return 'Location flagged';
    }
    case 'heartrate': {
      const bpm = payload.bpm ?? payload.heart_rate ?? payload.heartRate ?? payload.value;
      return typeof bpm === 'number' ? `Heart rate ${bpm} bpm` : 'Heart rate flagged';
    }
    case 'quiz':
      return 'Quiz activity flagged';
    default:
      return 'Flagged update';
  }
}

function AcknowledgeAction({ entry }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => updateLogEntryAcknowledged(entry.id, true),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['log-entries'] }),
  });

  return (
    <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] text-ink-faint">Once you've checked on this, clear it so it drops off the list.</p>
      <div className="flex shrink-0 items-center gap-2.5">
        {mutation.isError && <span className="text-[12.5px] font-bold text-alert-fg">Couldn't clear it — try again.</span>}
        <Button
          variant="secondary"
          size="sm"
          icon="check"
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          I've seen this
        </Button>
      </div>
    </div>
  );
}

function ClearedRow({ entry }) {
  return (
    <Card accent="quiet" className="opacity-80">
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-surface-fill text-ink-faint">
          <Icon name={TYPE_ICONS[entry.entryType] || 'info'} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold text-ink-soft">{describeAlertEntry(entry)}</p>
          <p className="mt-0.5 text-[12.5px] text-ink-faint">Flagged {formatDateTime(entry.timestamp)}</p>
        </div>
        <Chip tone="ok" dot className="shrink-0">
          Cleared {formatDateTime(entry.acknowledgedAt)}
        </Chip>
      </div>
    </Card>
  );
}

export default function Alerts() {
  const { user } = useAuth();
  const patientId = user?.patient_id;
  const [view, setView] = useState(VIEWS.NEEDS_LOOK);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['log-entries', { patientId, type: '', from: '', to: '' }],
    queryFn: () => fetchLogEntries({ patientId }),
    enabled: Boolean(patientId),
  });

  const allAlerts = useMemo(
    () =>
      (data || [])
        .filter((entry) => entry.requiresAttention)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [data]
  );

  const needsLook = useMemo(() => allAlerts.filter((entry) => !entry.acknowledgedAt), [allAlerts]);
  const cleared = useMemo(
    () =>
      allAlerts
        .filter((entry) => entry.acknowledgedAt)
        .sort((a, b) => new Date(b.acknowledgedAt).getTime() - new Date(a.acknowledgedAt).getTime()),
    [allAlerts]
  );

  const visible = view === VIEWS.NEEDS_LOOK ? needsLook : cleared;

  return (
    <div>
      <PageHeader
        eyebrow="Needs a look"
        title="Alerts"
        description="Anything the system flagged as needing a family member's attention."
      />

      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <FilterChip active={view === VIEWS.NEEDS_LOOK} onClick={() => setView(VIEWS.NEEDS_LOOK)}>
          Needs a look{needsLook.length > 0 ? ` · ${needsLook.length}` : ''}
        </FilterChip>
        <FilterChip active={view === VIEWS.CLEARED} onClick={() => setView(VIEWS.CLEARED)}>
          Cleared{cleared.length > 0 ? ` · ${cleared.length}` : ''}
        </FilterChip>
      </div>

      {isLoading && <LoadingBanner label="Loading alerts…" />}

      {isError && (
        <div className="space-y-4">
          <ErrorBanner error={error} label="Could not load alerts" />
          <Button variant="secondary" icon="refresh" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && visible.length === 0 && view === VIEWS.NEEDS_LOOK && (
        <Card accent="ok" bodyClassName="p-7 text-center sm:p-9">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-pill bg-ok-bg text-ok-fg">
            <Icon name="check" size={24} />
          </span>
          <p className="mt-4 font-display text-[21px] font-semibold text-ink">All clear</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[14.5px] leading-relaxed text-ink-faint">
            Nothing needs a look right now — everything's looking normal.
          </p>
        </Card>
      )}

      {!isLoading && !isError && visible.length === 0 && view === VIEWS.CLEARED && (
        <EmptyState
          icon="check"
          label="Nothing cleared yet"
          hint="Alerts you've acknowledged will show up here, with a note of when."
        />
      )}

      {!isLoading && !isError && visible.length > 0 && (
        <div className="space-y-3">
          {view === VIEWS.NEEDS_LOOK
            ? needsLook.map((entry) => (
                <LogEntryCard key={entry.id} entry={entry} actions={<AcknowledgeAction entry={entry} />} />
              ))
            : cleared.map((entry) => <ClearedRow key={entry.id} entry={entry} />)}
        </div>
      )}
    </div>
  );
}
