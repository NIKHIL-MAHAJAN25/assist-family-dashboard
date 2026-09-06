import { apiClient } from './client';

export async function registerDevice({ patientId, deviceType, identifier }) {
  const { data } = await apiClient.post('/api/devices/register', {
    patient_id: patientId,
    device_type: deviceType,
    identifier,
  });
  return data; // { device_id, api_key } - shown once
}
