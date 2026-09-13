import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchGeofenceZones } from '../api/geofenceZones';
import { useAuth } from '../context/AuthContext.jsx';
import { Chip } from '../ui';
import {
  extractInsideSafeZone,
  extractLatLng,
  extractZoneName,
  findContainingZone,
  nearestZone,
  formatDistance,
} from '../utils/geo.js';

const COORDINATE_KEY = /lat|lng|lon/i;

/** First letter up, everything else left exactly as it was — so a value like
 * "blank frame, no discernable activity" stays a readable sentence instead of
 * getting every word capitalised. Underscores/hyphens become spaces since
 * those only ever show up in raw enum-ish values, never real prose. */
function sentenceCase(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return String(value);
  const cleaned = value.replace(/[_-]+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** Title-cases a short field LABEL ("person_state" -> "Person State"). Only
 * ever applied to labels, never to the sentence-shaped values next to them. */
function labelCase(value) {
  if (typeof value !== 'string') return String(value);
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  if (typeof value === 'string') {
    return <span>{sentenceCase(value)}</span>;
  }
  return <span>{String(value)}</span>;
}

function PayloadGrid({ payload, excludeKeys }) {
  if (!payload || typeof payload !== 'object') {
    return <p className="text-[14px] text-ink-faint">No additional detail.</p>;
  }
  const excludeSet = excludeKeys ? new Set(excludeKeys) : null;
  const entries = Object.entries(payload).filter(
    ([key, value]) => !(excludeSet && excludeSet.has(key)) && (value === null || typeof value !== 'object')
  );
  if (entries.length === 0) {
    return <p className="text-[14px] text-ink-faint">No additional detail.</p>;
  }
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
            {labelCase(key)}
          </dt>
          <dd className="mt-0.5 text-[15px] text-ink">
            <GenericValue keyName={key} value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function FrameSummary({ payload }) {
  const { activity, objects_of_note: objects, person_state: personState, confidence } =
    payload || {};
  const hasGridContent =
    Boolean(personState) || typeof confidence === 'number' || (Array.isArray(objects) && objects.length > 0);

  return (
    <div>
      {activity && (
        <p className="font-display text-[19px] font-semibold text-ink">{sentenceCase(activity)}</p>
      )}
      {hasGridContent && (
        <dl className={['grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3', activity ? 'mt-3' : ''].join(' ')}>
          {personState && (
            <div>
              <dt className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                Person state
              </dt>
              <dd className="mt-0.5 text-[15px] text-ink">{sentenceCase(personState)}</dd>
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
                    {sentenceCase(String(obj))}
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

const GEOFENCE_CONSUMED_KEYS = [
  'lat', 'lng', 'lon', 'long', 'latitude', 'longitude',
  'inside_safe_zone', 'insideSafeZone', 'is_inside_safe_zone', 'isInsideSafeZone',
  'inside', 'is_safe', 'isSafe', 'within_safe_zone', 'withinSafeZone',
  'zone_name', 'zoneName', 'safe_zone_name', 'matched_zone_name',
  'zone_id', 'zoneId', 'safe_zone_id', 'safeZoneId',
];

/** One plain sentence naming where they were relative to the patient's known
 * places, instead of a bare lat/lng pair a family member can't picture. */
function locationSentence({ inside, coords, payload, zones, zonesReady }) {
  if (inside === true) {
    const nameFromPayload = extractZoneName(payload);
    if (nameFromPayload) return `At ${nameFromPayload}`;
    if (zonesReady && coords) {
      const match = findContainingZone(coords, zones) || nearestZone(coords, zones);
      if (match) return `At ${match.zone.name}`;
    }
    return 'In a safe zone';
  }
  if (inside === false) {
    if (zonesReady && coords && zones.length > 0) {
      const nearest = nearestZone(coords, zones);
      if (nearest) return `About ${formatDistance(nearest.distanceMeters)} from ${nearest.zone.name}`;
    }
    if (zonesReady) return "Outside the places you've marked";
    return 'Left a safe zone';
  }
  return null;
}

function GeofenceSummary({ payload }) {
  const { user } = useAuth();
  const patientId = user?.patient_id;

  const zonesQuery = useQuery({
    queryKey: ['geofence-zones', patientId],
    queryFn: () => fetchGeofenceZones(patientId),
    enabled: Boolean(patientId),
  });

  const zones = zonesQuery.data || [];
  const zonesReady = !zonesQuery.isLoading && !zonesQuery.isError;
  const inside = extractInsideSafeZone(payload);
  const coords = extractLatLng(payload);
  const sentence = locationSentence({ inside, coords, payload, zones, zonesReady });

  return (
    <div>
      {sentence && <p className="font-display text-[19px] font-semibold text-ink">{sentence}</p>}
      {coords && (
        <p className="mt-1 font-mono text-[12px] text-ink-faint">
          {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </p>
      )}
      <div className={sentence || coords ? 'mt-3' : ''}>
        <PayloadGrid payload={payload} excludeKeys={GEOFENCE_CONSUMED_KEYS} />
      </div>
    </div>
  );
}

// The backend contract only fully specifies the `frame` payload shape.
// For geofence / heartrate / quiz entries the exact fields aren't pinned down,
// so this renders whatever scalar fields are present in a readable key/value
// grid rather than guessing at field names that might not match production.
function GenericSummary({ payload }) {
  return <PayloadGrid payload={payload} />;
}

export default function LogEntrySummary({ entryType, payload }) {
  if (entryType === 'frame') return <FrameSummary payload={payload} />;
  if (entryType === 'geofence') return <GeofenceSummary payload={payload} />;
  return <GenericSummary payload={payload} />;
}
