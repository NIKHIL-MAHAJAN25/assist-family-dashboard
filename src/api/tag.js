import { apiClient } from './client';

export async function fetchTag(patientId) {
  const { data } = await apiClient.get(`/api/patients/${patientId}/tag`);
  return data;
}

export async function updateTag(patientId, body) {
  const { data } = await apiClient.put(`/api/patients/${patientId}/tag`, body);
  return data;
}

export async function rotateTag(patientId) {
  const { data } = await apiClient.post(`/api/patients/${patientId}/tag/rotate`);
  return data;
}
