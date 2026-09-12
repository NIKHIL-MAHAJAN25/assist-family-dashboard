import React from 'react';
import { Chip } from '../ui';

const COORDINATE_KEY = /lat|lng|lon/i;

function GenericValue({ keyName, value }) {
  if (value === null || value === undefined) {
    return <span className="text-ink-faint">—</span>;
  }
  if (typeof value === 'boolean') {
    return <Chip tone={value ? 'ok' : 'attend'}>{value ? 'Yes' : 'No'}</Chip>;
  }
  if (typeof value === 'number' && COORDINATE_KEY.test(keyName)) {
    return <span className="font-mono">{value.toFixed(5)}</span>;
  }
  return <span>{String(value)}</span>;
}

function titleCase(value) {
  if (typeof value !== 'string') return String(value);
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function FrameSummary({ payload }) {
  const { activity, objects_of_note: objects, person_state: personState, confidence } =
    payload || {};
  const hasGridContent =
    Boolean(personState) || typeof confidence === 'number' || (Array.isArray(objects) && objects.length > 0);

  return (
    <div>
      {activity && (
        <p className="font-display text-[19px] font-semibold text-ink">{titleCase(activity)}</p>
      )}
      {hasGridContent && (
        <dl className={['grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3', activity ? 'mt-3' : ''].join(' ')}>
          {personState && (
            <div>
              <dt className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                Person state
              </dt>
              <dd className="mt-0.5 text-[15px] text-ink">{titleCase(personState)}</dd>
            </div>
          )}
          {typeof confidence === 'number' && (
            <div>
              <dt className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                Confidence
              </dt>
              <dd className="mt-1.5 flex items-center gap-2">
                <span className="h-1.5 w-24 overflow-hidden rounded-pill bg-surface-fill">
                  <span
                    className="block h-full rounded-pill bg-sage"
                    style={{ width: `${Math.round(confidence * 100)}%` }}
                  />
                </span>
                <span className="text-[15px] text-ink">{Math.round(confidence * 100)}%</span>
              </dd>
            </div>
          )}
          {Array.isArray(objects) && objects.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                Objects of note
              </dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {objects.map((obj) => (
                  <Chip key={obj} tone="neutral">
                    {titleCase(String(obj))}
                  </Chip>
                ))}
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

// The backend contract only fully specifies the `frame` payload shape.
// For geofence / heartrate / quiz entries the exact fields aren't pinned down,
// so this renders whatever scalar fields are present in a readable key/value
// grid rather than guessing at field names that might not match production.
function GenericSummary({ payload }) {
  if (!payload || typeof payload !== 'object') {
    return <p className="text-[14px] text-ink-faint">No additional detail.</p>;
  }
  const entries = Object.entries(payload).filter(
    ([, value]) => value === null || typeof value !== 'object'
  );
  if (entries.length === 0) {
    return <p className="text-[14px] text-ink-faint">No additional detail.</p>;
  }
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
            {titleCase(key)}
          </dt>
          <dd className="mt-0.5 text-[15px] text-ink">
            <GenericValue keyName={key} value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function LogEntrySummary({ entryType, payload }) {
  if (entryType === 'frame') return <FrameSummary payload={payload} />;
  return <GenericSummary payload={payload} />;
}
