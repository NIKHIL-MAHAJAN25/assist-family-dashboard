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
import { LoadingBanner, ErrorBanner, EmptyState } from '../components/StatusBanner.jsx';

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
    onSuccess: invalidate,
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-800">Geofence Zones</h1>
        {!draft && (
          <button
            type="button"
            onClick={startCreate}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
          >
            New zone
          </button>
        )}
      </div>

      {isLoading && <LoadingBanner label="Loading zones..." />}
      {isError && <ErrorBanner error={error} label="Could not load geofence zones" />}

      {draft && (
        <form
          onSubmit={handleSave}
          className="mb-6 rounded-lg border border-slate-200 bg-white p-4 space-y-3"
        >
          <h2 className="text-sm font-semibold text-slate-700">
            {draft.id ? 'Edit zone' : 'New zone'}
          </h2>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Zone name</label>
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full max-w-sm rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="e.g. Home"
            />
          </div>

          <p className="text-xs text-slate-500">
            Click the map to place the zone center (blue). Drag the orange handle to resize the
            radius.
          </p>

          <GeofenceMap
            center={draft.center}
            radiusMeters={draft.radiusMeters}
            onCenterChange={(center) => setDraft((d) => ({ ...d, center }))}
            onRadiusChange={(radiusMeters) => setDraft((d) => ({ ...d, radiusMeters }))}
          />

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <span>Lat: {draft.center.lat.toFixed(5)}</span>
            <span>Lng: {draft.center.lng.toFixed(5)}</span>
            <label className="flex items-center gap-2">
              Radius (m):
              <input
                type="number"
                min={5}
                value={draft.radiusMeters}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, radiusMeters: Number(e.target.value) || 0 }))
                }
                className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
          </div>

          {saveError && <ErrorBanner error={saveError} label="Could not save zone" />}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save zone'}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!isLoading && !isError && zones.length === 0 && !draft && (
        <EmptyState label="No geofence zones yet." />
      )}

      <div className="space-y-2">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
          >
            <div>
              <p className="text-sm font-medium text-slate-800">{zone.name}</p>
              <p className="text-xs text-slate-500">
                {(zone.center_lat ?? zone.centerLat)?.toFixed?.(5)},{' '}
                {(zone.center_lng ?? zone.centerLng)?.toFixed?.(5)} · radius{' '}
                {zone.radius_meters ?? zone.radiusMeters} m
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startEdit(zone)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete zone "${zone.name}"?`)) {
                    deleteMutation.mutate(zone.id);
                  }
                }}
                className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
