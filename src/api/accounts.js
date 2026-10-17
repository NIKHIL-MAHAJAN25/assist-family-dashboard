import { apiClient } from './client';

export async function signup(body) {
  const { data } = await apiClient.post('/api/auth/signup', body);
  return data; // { token, user }
}

export async function joinWithInvite(body) {
  const { data } = await apiClient.post('/api/auth/join', body);
  return data; // { token, user }
}

export async function previewInvite(code) {
  const { data } = await apiClient.get(`/api/invites/${encodeURIComponent(code)}`);
  return data; // { kind, patient_first_name, invited_by, expires_at }
}

export async function listCaregivers(patientId) {
  const { data } = await apiClient.get(`/api/patients/${patientId}/caregivers`);
  return data;
}

export async function listInvites(patientId) {
  const { data } = await apiClient.get(`/api/patients/${patientId}/invites`);
  return data;
}

export async function createInvite(patientId, kind) {
  const { data } = await apiClient.post(`/api/patients/${patientId}/invites`, { kind });
  return data; // { code, kind, expires_at }
}

export async function revokeInvite(patientId, code) {
  await apiClient.delete(`/api/patients/${patientId}/invites/${code}`);
}

export async function getDecisions(patientId) {
  const { data } = await apiClient.get(`/api/patients/${patientId}/decisions`);
  return data;
}

/** "GTCN46" → "GTC-N46", easier to read aloud. */
export function prettyCode(code) {
  return code ? `${code.slice(0, 3)}-${code.slice(3)}` : '';
}
