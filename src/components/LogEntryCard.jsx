import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLogEntrySaved } from '../api/logEntries';
import LogEntryImage from './LogEntryImage.jsx';
import LogEntrySummary from './LogEntrySummary.jsx';

const TYPE_LABELS = {
  frame: 'Camera Frame',
  geofence: 'Geofence',
  heartrate: 'Heart Rate',
  quiz: 'Quiz',
};

const DECISION_LABELS = {
  log_only: 'Logged only',
  alert_family: 'Family alerted',
  check_in: 'Check-in triggered',
};

export default function LogEntryCard({ entry }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (nextSaved) => updateLogEntrySaved(entry.id, nextSaved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['log-entries'] });
    },
  });

  const timestamp = entry.timestamp ? new Date(entry.timestamp) : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            {TYPE_LABELS[entry.entryType] || entry.entryType}
          </span>
          {entry.requiresAttention && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
              Needs attention
            </span>
          )}
          {entry.agentDecision && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              {DECISION_LABELS[entry.agentDecision] || entry.agentDecision}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <time className="text-xs text-slate-400" dateTime={entry.timestamp}>
            {timestamp ? timestamp.toLocaleString() : 'Unknown time'}
          </time>
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(entry.isSaved)}
              disabled={mutation.isPending}
              onChange={(e) => mutation.mutate(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-400"
            />
            Save
          </label>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
        {entry.entryType === 'frame' && (
          <LogEntryImage imagePublicId={entry.imagePublicId} alt="Camera frame snapshot" />
        )}
        <LogEntrySummary entryType={entry.entryType} payload={entry.payload} />
      </div>

      {mutation.isError && (
        <p className="mt-2 text-xs text-red-600">Could not update save state. Try again.</p>
      )}
    </div>
  );
}
