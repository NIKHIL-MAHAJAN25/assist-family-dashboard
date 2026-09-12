import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchGeofenceZones,
  createGeofenceZone,
  updateGeofenceZone,
  deleteGeofenceZone,
} from '../api/geofenceZones';
import { useAuth } from '../context/AuthContext.jsx';
import GeofenceMap from '../components/GeofenceMap.jsx';
import {
  PageHeader,
  Card,
  SectionTitle,
  Field,
  Button,
  IconButton,
  Chip,
  Icon,
  LoadingBanner,
  ErrorBanner,
  EmptyState,
} from '../ui';

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };
const DEFAULT_RADIUS = 150;

function blankDraft() {
  return { id: null, name: '', center: DEFAULT_CENTER, radiusMeters: DEFAULT_RADIUS };
}

export default function GeofenceZones() {
  const { user } = useAuth();
  const patientId = user?.patient_id;
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState(null); // null = editor closed
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['geofence-zones', patientId],
    queryFn: () => fetchGeofenceZones(patientId),
    enabled: Boolean(patientId),
  });

  const zones = data || [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['geofence-zones', patientId] });

  const createMutation = useMutation({
    mutationFn: (zone) => createGeofenceZone(zone),
    onSuccess: () => {
      invalidate();
      setDraft(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => updateGeofenceZone(id, updates),
    onSuccess: () => {
      invalidate();
      setDraft(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteGeofenceZone(id),
    onSuccess: () => {
      invalidate();
      setConfirmDeleteId(null);
    },
  });

  function startCreate() {
    setDraft(blankDraft());
  }

  function startEdit(zone) {
    setDraft({
      id: zone.id,
      name: zone.name,
      center: { lat: zone.center_lat ?? zone.centerLat, lng: zone.center_lng ?? zone.centerLng },
      radiusMeters: zone.radius_meters ?? zone.radiusMeters,
    });
  }

  function handleSave(e) {
    e.preventDefault();
    if (!draft) return;
    const payload = {
      patient_id: patientId,
      name: draft.name,
      center_lat: draft.center.lat,
      center_lng: draft.center.lng,
      radius_meters: draft.radiusMeters,
    };
    if (draft.id) {
      updateMutation.mutate({ id: draft.id, updates: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;
  const saveError = createMutation.error || updateMutation.error;

  return (
    <div>
      <PageHeader
        eyebrow="Safety"
        title="Safe zones"
        description="Draw the places it's safe to be — home, a favourite park, a relative's house. Leaving one of these areas is what sends an alert."
        actions={
          !draft && (
            <Button icon="plus" onClick={startCreate}>
              New zone
            </Button>
          )
        }
      />

      {isLoading && <LoadingBanner label="Loading zones…" />}
      {isError && <ErrorBanner error={error} label="Could not load safe zones" />}

      {draft && (
        <Card emphasis className="mb-7">
          <form onSubmit={handleSave} className="space-y-5">
            <SectionTitle hint="Click the map to place the zone. Drag the clay handle to resize it.">
              {draft.id ? 'Edit zone' : 'New zone'}
            </SectionTitle>

            <Field
              label="Zone name"
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Home"
              className="max-w-sm"
            />

            <GeofenceMap
              center={draft.center}
              radiusMeters={draft.radiusMeters}
              onCenterChange={(center) => setDraft((d) => ({ ...d, center }))}
              onRadiusChange={(radiusMeters) => setDraft((d) => ({ ...d, radiusMeters }))}
            />

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-card bg-surface-sunken px-4 py-3">
                <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                  Latitude
                </p>
                <p className="mt-1 font-mono text-[15px] text-ink">{draft.center.lat.toFixed(5)}</p>
              </div>
              <div className="rounded-card bg-surface-sunken px-4 py-3">
                <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                  Longitude
                </p>
                <p className="mt-1 font-mono text-[15px] text-ink">{draft.center.lng.toFixed(5)}</p>
              </div>
              <Field
                type="number"
                label="Radius (m)"
                min={5}
                value={draft.radiusMeters}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, radiusMeters: Number(e.target.value) || 0 }))
                }
              />
            </div>

            {saveError && <ErrorBanner error={saveError} label="Could not save zone" />}

            <div className="flex gap-2.5">
              <Button type="submit" loading={saving}>
                {saving ? 'Saving…' : 'Save zone'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!isLoading && !isError && zones.length === 0 && !draft && (
        <EmptyState
          icon="shield"
          label="No safe zones yet"
          hint="Add the places it's safe to be, and you'll hear about it if that changes."
          action={
            <Button icon="plus" onClick={startCreate}>
              Draw the first one
            </Button>
          }
        />
      )}

      <div className="space-y-3">
        {zones.map((zone) => {
          const lat = zone.center_lat ?? zone.centerLat;
          const lng = zone.center_lng ?? zone.centerLng;
          const radius = zone.radius_meters ?? zone.radiusMeters;
          const confirming = confirmDeleteId === zone.id;

          return (
            <Card key={zone.id} accent="sage" interactive>
              <div className="flex items-center gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-sage-100 text-sage-700">
                  <Icon name="shield" size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[18px] font-semibold text-ink">{zone.name}</p>
                  <p className="mt-0.5 truncate font-mono text-[13px] text-ink-faint">
                    {lat?.toFixed?.(5)}, {lng?.toFixed?.(5)}
                  </p>
                </div>
                <Chip tone="sage">{radius} m</Chip>

                {confirming ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[13.5px] font-bold text-ink-soft">
                      Delete {zone.name}?
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(zone.id)}
                    >
                      Delete
                    </Button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <IconButton icon="pencil" label="Edit zone" onClick={() => startEdit(zone)} />
                    <IconButton
                      icon="trash"
                      label="Delete zone"
                      variant="danger"
                      onClick={() => setConfirmDeleteId(zone.id)}
                    />
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
