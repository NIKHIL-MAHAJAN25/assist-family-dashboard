import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLogEntries } from '../api/logEntries';
import { useAuth } from '../context/AuthContext.jsx';
import LogEntryCard from '../components/LogEntryCard.jsx';
import { LoadingBanner, ErrorBanner } from '../components/StatusBanner.jsx';
import { PageHeader, Card, Icon } from '../ui';
import { formatDateTime } from '../utils/datetime.js';

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

  const hasAlerts = alerts.length > 0;

  return (
    <div>
      <PageHeader
        eyebrow="Needs a look"
        title="Alerts"
        description="Anything the system flagged as needing a family member's attention, most recent first."
      />

      {isLoading && <LoadingBanner label="Loading alerts..." />}
      {isError && <ErrorBanner error={error} label="Could not load alerts" />}

      {!isLoading && !isError && (
        <Card accent={hasAlerts ? 'alert' : 'ok'} className="mb-6">
          <div className="flex items-center gap-4">
            <span
              className={[
                'grid h-11 w-11 shrink-0 place-items-center rounded-pill',
                hasAlerts ? 'bg-alert-bg text-alert-fg' : 'bg-ok-bg text-ok-fg',
              ].join(' ')}
            >
              <Icon name={hasAlerts ? 'warning' : 'check'} size={20} />
            </span>
            <div>
              <p className="font-display text-[19px] font-semibold text-ink">
                {hasAlerts
                  ? `${alerts.length} ${alerts.length === 1 ? 'thing needs' : 'things need'} a look`
                  : 'All clear'}
              </p>
              <p className="mt-0.5 text-[14px] text-ink-faint">
                {hasAlerts
                  ? `Most recent ${formatDateTime(alerts[0]?.timestamp)}`
                  : 'No alerts right now — everything looks normal.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {!isLoading && !isError && hasAlerts && (
        <div className="space-y-3">
          {alerts.map((entry) => (
            <LogEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
