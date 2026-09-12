import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLogEntries } from '../api/logEntries';
import { useAuth } from '../context/AuthContext.jsx';
import LogEntryCard from '../components/LogEntryCard.jsx';
import { LoadingBanner, ErrorBanner, EmptyState } from '../components/StatusBanner.jsx';
import { PageHeader, Panel, Field, Button, FilterChip } from '../ui';

const ENTRY_TYPES = ['frame', 'geofence', 'heartrate', 'quiz'];

const TYPE_LABELS = {
  frame: 'Camera',
  geofence: 'Location',
  heartrate: 'Heart rate',
  quiz: 'Quiz',
};

function dayLabel(date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

function groupByDay(entries) {
  const groups = [];
  const byKey = new Map();
  for (const entry of entries) {
    const date = new Date(entry.timestamp);
    const key = date.toDateString();
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: dayLabel(date), items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(entry);
  }
  return groups;
}

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
  const groups = groupByDay(entries);
  const hasFilters = Boolean(type || from || to);

  return (
    <div>
      <PageHeader
        eyebrow="Daily record"
        title="Timeline"
        description="Everything the system has noticed about the day, newest first."
      />

      <Panel className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={type === ''} onClick={() => setType('')}>
            All
          </FilterChip>
          {ENTRY_TYPES.map((t) => (
            <FilterChip key={t} active={type === t} onClick={() => setType(t)}>
              {TYPE_LABELS[t] || t}
            </FilterChip>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field
            type="date"
            label="From"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-40"
          />
          <Field
            type="date"
            label="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-40"
          />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              icon="x"
              onClick={() => {
                setType('');
                setFrom('');
                setTo('');
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </Panel>

      {!patientId && (
        <ErrorBanner
          error={{ message: 'No patient is associated with this account.' }}
          label="Missing patient"
        />
      )}
      {isLoading && <LoadingBanner label="Loading timeline..." />}
      {isError && <ErrorBanner error={error} label="Could not load the timeline" />}
      {!isLoading && !isError && entries.length === 0 && (
        <EmptyState
          icon="inbox"
          label="Nothing recorded yet"
          hint="Once the system notices something about the day, it will show up here."
        />
      )}

      <div className="space-y-8">
        {groups.map((group) => (
          <div key={group.key}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="whitespace-nowrap font-display text-[17px] font-semibold text-ink">
                {group.label}
              </h2>
              <span aria-hidden="true" className="h-px flex-1 bg-line" />
              <span className="whitespace-nowrap text-[13px] text-ink-faint">
                {group.items.length} {group.items.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            <div className="space-y-3">
              {group.items.map((entry) => (
                <LogEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
