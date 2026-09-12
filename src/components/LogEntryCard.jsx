import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLogEntrySaved } from '../api/logEntries';
import LogEntryImage from './LogEntryImage.jsx';
import LogEntrySummary from './LogEntrySummary.jsx';
import { Card, Chip, Icon, CheckPill } from '../ui';
import { formatTime, formatDateTime } from '../utils/datetime.js';

const TYPE_LABELS = {
  frame: 'Camera Frame',
  geofence: 'Geofence',
  heartrate: 'Heart Rate',
  quiz: 'Quiz',
};

const TYPE_ICONS = {
  frame: 'camera',
  geofence: 'pin',
  heartrate: 'heart',
  quiz: 'spark',
};

const DECISION_LABELS = {
  log_only: 'Logged only',
  alert_family: 'Family alerted',
  check_in: 'Check-in triggered',
};

function pickAccent(entry) {
  if (entry.requiresAttention) return 'alert';
  if (entry.agentDecision === 'check_in') return 'attend';
  if (entry.entryType === 'frame') return 'sage';
  if (entry.entryType === 'geofence') return 'info';
  if (entry.entryType === 'quiz') return 'ok';
  return 'quiet';
}

export default function LogEntryCard({ entry }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (nextSaved) => updateLogEntrySaved(entry.id, nextSaved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['log-entries'] });
    },
  });

  const timeLabel = formatTime(entry.timestamp);
  const fullLabel = formatDateTime(entry.timestamp);

  return (
    <Card accent={pickAccent(entry)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-sage-100 text-sage-700">
            <Icon name={TYPE_ICONS[entry.entryType] || 'info'} size={17} />
          </span>
          <span className="font-display text-[17px] font-semibold text-ink">
            {TYPE_LABELS[entry.entryType] || entry.entryType}
          </span>
          {entry.requiresAttention && (
            <Chip tone="alert" dot>
              Needs a look
            </Chip>
          )}
          {entry.agentDecision && (
            <Chip tone="attend">{DECISION_LABELS[entry.agentDecision] || entry.agentDecision}</Chip>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <time dateTime={entry.timestamp} title={fullLabel} className="text-[13px] text-ink-faint">
            {timeLabel}
          </time>
          <CheckPill
            checked={Boolean(entry.isSaved)}
            disabled={mutation.isPending}
            onChange={(e) => mutation.mutate(e.target.checked)}
            icon={<Icon name="bookmark" size={14} />}
          >
            Save
          </CheckPill>
        </div>
      </div>

      <div
        className={
          entry.entryType === 'frame'
            ? 'mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]'
            : 'mt-4'
        }
      >
        {entry.entryType === 'frame' && (
          <LogEntryImage imagePublicId={entry.imagePublicId} alt="Camera frame snapshot" />
        )}
        <LogEntrySummary entryType={entry.entryType} payload={entry.payload} />
      </div>

      {mutation.isError && (
        <p className="mt-3 text-[13px] font-bold text-alert-fg">Could not update save state. Try again.</p>
      )}
    </Card>
  );
}
