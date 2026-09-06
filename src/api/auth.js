import { apiClient } from './client';

export async function login(email, password) {
  const { data } = await apiClient.post('/api/auth/login', { email, password });
  return data; // { token, user: { id, name, role, patient_id } }
}
