import { apiClient } from './client';

export async function fetchLogEntries({ patientId, type, from, to }) {
  const params = {};
  if (patientId) params.patient_id = patientId;
  if (type) params.type = type;
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await apiClient.get('/api/log-entries', { params });
  return data;
}

export async function fetchLogEntry(id) {
  const { data } = await apiClient.get(`/api/log-entries/${id}`);
  return data;
}

export async function updateLogEntrySaved(id, isSaved) {
  const { data } = await apiClient.patch(`/api/log-entries/${id}`, { is_saved: isSaved });
  return data;
}

export async function updateLogEntryAcknowledged(id, acknowledged) {
  const { data } = await apiClient.patch(`/api/log-entries/${id}`, { acknowledged });
  return data;
}
