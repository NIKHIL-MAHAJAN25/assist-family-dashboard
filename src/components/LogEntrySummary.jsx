import React from 'react';

function titleCase(value) {
  if (typeof value !== 'string') return String(value);
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function FrameSummary({ payload }) {
  const { activity, objects_of_note: objects, person_state: personState, confidence } =
    payload || {};
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {activity && (
        <div>
          <dt className="text-slate-400">Activity</dt>
          <dd className="text-slate-700">{titleCase(activity)}</dd>
        </div>
      )}
      {personState && (
        <div>
          <dt className="text-slate-400">Person state</dt>
          <dd className="text-slate-700">{titleCase(personState)}</dd>
        </div>
      )}
      {typeof confidence === 'number' && (
        <div>
          <dt className="text-slate-400">Confidence</dt>
          <dd className="text-slate-700">{Math.round(confidence * 100)}%</dd>
        </div>
      )}
      {Array.isArray(objects) && objects.length > 0 && (
        <div className="sm:col-span-2">
          <dt className="text-slate-400">Objects of note</dt>
          <dd className="text-slate-700">{objects.join(', ')}</dd>
        </div>
      )}
    </dl>
  );
}

// The backend contract only fully specifies the `frame` payload shape.
// For geofence / heartrate / quiz entries the exact fields aren't pinned down,
// so this renders whatever scalar fields are present in a readable key/value
// grid rather than guessing at field names that might not match production.
function GenericSummary({ payload }) {
  if (!payload || typeof payload !== 'object') {
    return <p className="text-sm text-slate-500">No additional detail.</p>;
  }
  const entries = Object.entries(payload).filter(
    ([, value]) => value === null || typeof value !== 'object'
  );
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">No additional detail.</p>;
  }
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-slate-400">{titleCase(key)}</dt>
          <dd className="text-slate-700">{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function LogEntrySummary({ entryType, payload }) {
  if (entryType === 'frame') return <FrameSummary payload={payload} />;
  return <GenericSummary payload={payload} />;
}
