import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createGeofenceZone,
  deleteGeofenceZone,
  updateGeofenceZone,
} from '../api/geofenceZones.js';
import { useEntries, usePatientId, useStatus, useZones } from '../lib/hooks.js';
import { dayBounds, minutesInZones } from '../lib/story.js';
import { formatTime } from '../utils/datetime.js';
import { formatDistance, haversineMeters } from '../utils/geo.js';
import ZoneMap from '../components/ZoneMap.jsx';
import { Badge, Button, ErrorNote, Field, Icon, IconButton, Loading, cx } from '../ui';

function Editor({ draft, setDraft, onCancel, onSave, saving, error, isNew }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-bold">{isNew ? 'New safe place' : `Edit ${draft.originalName}`}</p>
        <p className="mt-1 text-sm text-ink-3">
          Click the map to move the centre, or drag the dark dot. Drag the blue dot to resize.
        </p>
      </div>
      <Field label="Name">
        <input
          className="input"
          value={draft.name}
          placeholder="e.g. Home, Sarah's house, the park"
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          autoFocus
        />
      </Field>
      <Field label={`Radius — ${formatDistance(draft.radius)}`}>
        <input
          type="range"
          min={20}
          max={1000}
          step={10}
          value={draft.radius}
          onChange={(e) => setDraft({ ...draft, radius: Number(e.target.value) })}
          className="w-full accent-accent"
        />
        <span className="mt-1 flex justify-between text-xs text-ink-4">
          <span>20 m</span>
          <span>1 km</span>
        </span>
      </Field>
      {error && <ErrorNote error={error} />}
      <div className="flex gap-2">
        <Button variant="primary" onClick={onSave} loading={saving} disabled={!draft.name.trim()}>
          {isNew ? 'Add place' : 'Save changes'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function Places() {
  const patientId = usePatientId();
  const qc = useQueryClient();
  const zones = useZones();
  const status = useStatus();
  const [dayStart] = dayBounds();
  const entries = useEntries({ from: dayStart });

  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['zones'] });
    qc.invalidateQueries({ queryKey: ['status'] });
  };
  const create = useMutation({ mutationFn: createGeofenceZone, onSuccess: () => { invalidate(); setDraft(null); } });
  const update = useMutation({
    mutationFn: ({ id, body }) => updateGeofenceZone(id, body),
    onSuccess: () => { invalidate(); setDraft(null); },
  });
  const remove = useMutation({
    mutationFn: deleteGeofenceZone,
    onSuccess: () => { invalidate(); setConfirmDelete(null); setSelectedId(null); },
  });

  const loc = status.data?.location;
  const current = loc?.lat != null ? { lat: loc.lat, lng: loc.lng } : null;
  const path = useMemo(
    () =>
      (entries.data || [])
        .filter((e) => e.entryType === 'geofence' && typeof e.payload?.lat === 'number')
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map((e) => ({ lat: e.payload.lat, lng: e.payload.lng, flagged: e.requiresAttention, label: formatTime(e.timestamp) })),
    [entries.data]
  );

  const list = zones.data || [];
  const minutes = useMemo(() => minutesInZones(entries.data || [], list), [entries.data, list]);
  const fmtMins = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : `${Math.round(m)} min`);
  const editingId = draft?.id;
  const shownZones = list.filter((z) => z.id !== editingId);

  function startNew() {
    const base = current || (list[0] ? { lat: list[0].centerLat, lng: list[0].centerLng } : { lat: 12.9716, lng: 77.6412 });
    setSelectedId(null);
    setDraft({ name: '', lat: base.lat, lng: base.lng, radius: 150 });
  }
  function startEdit(z) {
    setSelectedId(z.id);
    setDraft({ id: z.id, originalName: z.name, name: z.name, lat: z.centerLat, lng: z.centerLng, radius: z.radiusMeters });
  }
  function save() {
    const body = { name: draft.name.trim(), center_lat: draft.lat, center_lng: draft.lng, radius_meters: draft.radius };
    if (draft.id) update.mutate({ id: draft.id, body });
    else create.mutate({ ...body, patient_id: patientId });
  }

  return (
    <div className="grid h-[calc(100vh-56px)] grid-cols-[380px_1fr]">
      <aside className="flex flex-col overflow-y-auto border-r border-line bg-surface">
        <div className="border-b border-line p-5">
          <h1 className="text-xl font-bold">Safe places</h1>
          <p className="mt-1 text-sm text-ink-3">
            Leaving every one of these sends an alert. Draw generously — a tight circle around home
            will alert on a walk to the shop.
          </p>
        </div>

        <div className="flex-1 p-5">
          {draft ? (
            <Editor
              draft={draft}
              setDraft={setDraft}
              isNew={!draft.id}
              saving={create.isPending || update.isPending}
              error={create.error || update.error}
              onCancel={() => setDraft(null)}
              onSave={save}
            />
          ) : zones.isLoading ? (
            <Loading />
          ) : (
            <>
              <ul className="space-y-2">
                {list.map((z) => {
                  const inside =
                    current && haversineMeters(current.lat, current.lng, z.centerLat, z.centerLng) <= z.radiusMeters;
                  const selected = z.id === selectedId;
                  return (
                    <li
                      key={z.id}
                      className={cx(
                        'rounded-md border p-3 transition-colors',
                        selected ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          onClick={() => setSelectedId(selected ? null : z.id)}
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-ok-soft text-ok">
                            <Icon name={z.name.toLowerCase() === 'home' ? 'home' : 'pin'} size={17} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{z.name}</span>
                            <span className="block text-sm text-ink-3">
                              {formatDistance(z.radiusMeters)} radius
                              {minutes[z.id] >= 1 && <> · <span className="font-semibold text-ink-2">{fmtMins(minutes[z.id])}</span> here today</>}
                            </span>
                          </span>
                        </button>
                        {inside && (
                          <span className="flex items-center gap-1.5 rounded-sm bg-ok-soft px-1.5 py-0.5 text-xs font-semibold text-ok">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inset-0 animate-ping rounded-full bg-ok opacity-60" />
                              <span className="relative h-2 w-2 rounded-full bg-ok" />
                            </span>
                            Here now
                          </span>
                        )}
                        {confirmDelete === z.id ? null : (
                          <>
                            <IconButton icon="pencil" label={`Edit ${z.name}`} onClick={() => startEdit(z)} />
                            <IconButton icon="trash" label={`Delete ${z.name}`} onClick={() => setConfirmDelete(z.id)} />
                          </>
                        )}
                      </div>
                      {confirmDelete === z.id && (
                        <div className="mt-3 flex items-center justify-between gap-2 rounded bg-act-soft px-3 py-2">
                          <span className="text-sm text-act">Delete {z.name}?</span>
                          <span className="flex gap-1.5">
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                              Keep
                            </Button>
                            <Button size="sm" variant="danger" loading={remove.isPending} onClick={() => remove.mutate(z.id)}>
                              Delete
                            </Button>
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {!list.length && (
                <p className="rounded-md border border-dashed border-line-strong p-5 text-center text-sm text-ink-3">
                  No safe places yet. Start with home.
                </p>
              )}
              <Button variant="primary" icon="plus" className="mt-4 w-full" onClick={startNew}>
                Add a safe place
              </Button>
            </>
          )}
        </div>

        <div className="border-t border-line bg-subtle px-5 py-3 text-xs text-ink-3">
          <p className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" /> Where they are now
            <span className="ml-2 h-2.5 w-2.5 rounded-full bg-ink" /> Today's path
            <span className="ml-2 h-2.5 w-2.5 rounded-full bg-act" /> Outside
          </p>
        </div>
      </aside>

      <ZoneMap
        zones={shownZones}
        path={path}
        current={current}
        selectedId={selectedId}
        onZoneClick={(z) => !draft && setSelectedId(z.id)}
        draft={draft}
        onDraftChange={setDraft}
        onMapClick={draft ? (p) => setDraft({ ...draft, lat: p.lat, lng: p.lng }) : undefined}
        style={{ height: '100%', width: '100%' }}
        fitKey={`${list.length}-${path.length}-${current ? 1 : 0}`}
      />
    </div>
  );
}
