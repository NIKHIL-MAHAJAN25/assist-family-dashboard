import { apiClient } from './client';

export async function fetchPatientStatus(patientId) {
  const { data } = await apiClient.get(`/api/patients/${patientId}/status`);
  return data;
}
