import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLogEntrySaved } from '../api/logEntries';
import { useAuth } from '../context/AuthContext.jsx';
import LogEntryImage from './LogEntryImage.jsx';
import LogEntrySummary from './LogEntrySummary.jsx';
import { Card, Chip, Icon, CheckPill } from '../ui';
import { formatTime, formatDateTime } from '../utils/datetime.js';
import { extractInsideSafeZone } from '../utils/geo.js';

const TYPE_ICONS = {
  frame: 'camera',
  geofence: 'pin',
  heartrate: 'heart',
  quiz: 'spark',
};

function sentenceCase(value) {
  if (!value || typeof value !== 'string') return '';
  const cleaned = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** What this entry means to a person, not what the system calls it — derived
 * from the payload where that changes the meaning (a geofence entry reads
 * completely differently depending on whether they're inside a zone or not). */
function entryTypeLabel(entry) {
  switch (entry?.entryType) {
    case 'geofence':
      return extractInsideSafeZone(entry?.payload) === false ? 'Left a safe zone' : 'Location';
    case 'frame':
      return 'Camera';
    case 'heartrate':
      return 'Heart rate';
    case 'quiz':
      return 'Daily quiz';
    default:
      return sentenceCase(entry?.entryType) || 'Update';
  }
}

function decisionLabel(decision, patientName) {
  switch (decision) {
    case 'log_only':
      return 'Noted';
    case 'alert_family':
      return 'Family alerted';
    case 'check_in':
      return patientName ? `Checked in on ${patientName}` : 'Checked in';
    default:
      return sentenceCase(decision) || decision;
  }
}

function pickAccent(entry) {
  if (entry.requiresAttention) return 'alert';
  if (entry.agentDecision === 'check_in') return 'attend';
  if (entry.entryType === 'frame') return 'sage';
  if (entry.entryType === 'geofence') return 'info';
  if (entry.entryType === 'quiz') return 'ok';
  return 'quiet';
}

export default function LogEntryCard({ entry, actions }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const patientName = user?.patient_name || null;

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
            {entryTypeLabel(entry)}
          </span>
          {entry.requiresAttention && (
            <Chip tone="alert" dot>
              Needs a look
            </Chip>
          )}
          {entry.agentDecision && (
            <Chip tone="attend">{decisionLabel(entry.agentDecision, patientName)}</Chip>
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

      {actions && <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-line pt-4">{actions}</div>}
    </Card>
  );
}
