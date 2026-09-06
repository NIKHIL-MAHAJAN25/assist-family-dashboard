import { apiClient } from './client';

export async function fetchQuizHistory(patientId) {
  const { data } = await apiClient.get('/api/quiz/history', {
    params: { patient_id: patientId },
  });
  return data;
}
