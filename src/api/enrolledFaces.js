import { apiClient } from './client';

export async function fetchEnrolledFaces(patientId) {
  const { data } = await apiClient.get('/api/enrolled-faces', {
    params: { patient_id: patientId },
  });
  return data;
}

export async function createEnrolledFace({ patientId, name, referenceEmbedding }) {
  const { data } = await apiClient.post('/api/enrolled-faces', {
    patient_id: patientId,
    name,
    reference_embedding: referenceEmbedding,
  });
  return data;
}

export async function deleteEnrolledFace(id) {
  await apiClient.delete(`/api/enrolled-faces/${id}`);
}
