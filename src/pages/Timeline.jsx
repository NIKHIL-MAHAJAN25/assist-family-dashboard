import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLogEntries } from '../api/logEntries';
import { useAuth } from '../context/AuthContext.jsx';
import LogEntryCard from '../components/LogEntryCard.jsx';
import { LoadingBanner, ErrorBanner, EmptyState } from '../components/StatusBanner.jsx';

const ENTRY_TYPES = ['frame', 'geofence', 'heartrate', 'quiz'];

export default function Timeline() {
  const { user } = useAuth();
  const patientId = user?.patient_id;

  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['log-entries', { patientId, type, from, to }],
    queryFn: () => fetchLogEntries({ patientId, type: type || undefined, from: from || undefined, to: to || undefined }),
    enabled: Boolean(patientId),
  });

  const entries = [...(data || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Timeline</h1>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All types</option>
            {ENTRY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        {(type || from || to) && (
          <button
            type="button"
            onClick={() => {
              setType('');
              setFrom('');
              setTo('');
            }}
            className="text-xs text-sky-700 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {!patientId && (
        <ErrorBanner
          error={{ message: 'No patient is associated with this account.' }}
          label="Missing patient"
        />
      )}
      {isLoading && <LoadingBanner label="Loading timeline..." />}
      {isError && <ErrorBanner error={error} label="Could not load the timeline" />}
      {!isLoading && !isError && entries.length === 0 && (
        <EmptyState label="No log entries match these filters." />
      )}

      <div className="space-y-3">
        {entries.map((entry) => (
          <LogEntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
