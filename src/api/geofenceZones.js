import { apiClient } from './client';

export async function fetchGeofenceZones(patientId) {
  const { data } = await apiClient.get('/api/geofence-zones', {
    params: { patient_id: patientId },
  });
  return data;
}

export async function createGeofenceZone(zone) {
  const { data } = await apiClient.post('/api/geofence-zones', zone);
  return data;
}

export async function updateGeofenceZone(id, updates) {
  const { data } = await apiClient.patch(`/api/geofence-zones/${id}`, updates);
  return data;
}

export async function deleteGeofenceZone(id) {
  await apiClient.delete(`/api/geofence-zones/${id}`);
}
