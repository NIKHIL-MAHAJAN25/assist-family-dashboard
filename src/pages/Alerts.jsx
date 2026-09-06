import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLogEntries } from '../api/logEntries';
import { useAuth } from '../context/AuthContext.jsx';
import LogEntryCard from '../components/LogEntryCard.jsx';
import { LoadingBanner, ErrorBanner, EmptyState } from '../components/StatusBanner.jsx';

export default function Alerts() {
  const { user } = useAuth();
  const patientId = user?.patient_id;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['log-entries', { patientId, type: '', from: '', to: '' }],
    queryFn: () => fetchLogEntries({ patientId }),
    enabled: Boolean(patientId),
  });

  const alerts = (data || [])
    .filter((entry) => entry.requiresAttention)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-1">Alerts</h1>
      <p className="text-sm text-slate-500 mb-4">
        Entries the AI companion flagged as needing attention.
      </p>

      {isLoading && <LoadingBanner label="Loading alerts..." />}
      {isError && <ErrorBanner error={error} label="Could not load alerts" />}
      {!isLoading && !isError && alerts.length === 0 && (
        <EmptyState label="No alerts right now." />
      )}

      <div className="space-y-3">
        {alerts.map((entry) => (
          <LogEntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
