import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEnrolledFaces, createEnrolledFace, deleteEnrolledFace } from '../api/enrolledFaces';
import { useAuth } from '../context/AuthContext.jsx';
import { computeFaceDescriptor } from '../utils/faceApi';
import { LoadingBanner, ErrorBanner, EmptyState } from '../components/StatusBanner.jsx';

export default function Faces() {
  const { user } = useAuth();
  const patientId = user?.patient_id;
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [formError, setFormError] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['enrolled-faces', patientId],
    queryFn: () => fetchEnrolledFaces(patientId),
    enabled: Boolean(patientId),
  });

  const faces = data || [];

  const createMutation = useMutation({
    mutationFn: createEnrolledFace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrolled-faces', patientId] });
      setName('');
      setFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEnrolledFace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enrolled-faces', patientId] }),
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    if (!file) {
      setFormError('Choose a reference photo first.');
      return;
    }
    setProcessing(true);
    try {
      const referenceEmbedding = await computeFaceDescriptor(file);
      await createMutation.mutateAsync({ patientId, name, referenceEmbedding });
    } catch (err) {
      setFormError(err.message || 'Could not process that photo.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Face Enrollment</h1>

      <form
        onSubmit={handleSubmit}
        className="mb-6 rounded-lg border border-slate-200 bg-white p-4 space-y-3 max-w-md"
      >
        <h2 className="text-sm font-semibold text-slate-700">Enroll a new face</h2>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            placeholder="e.g. Daughter Sarah"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Reference photo (clear, front-facing)
          </label>
          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
          <p className="mt-1 text-xs text-slate-400">
            The face descriptor is computed in your browser; only the resulting numbers are sent
            to the server, not the photo itself.
          </p>
        </div>

        {formError && <ErrorBanner error={{ message: formError }} label="Could not enroll face" />}

        <button
          type="submit"
          disabled={processing || createMutation.isPending}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {processing ? 'Processing photo...' : 'Enroll face'}
        </button>
      </form>

      {isLoading && <LoadingBanner label="Loading enrolled faces..." />}
      {isError && <ErrorBanner error={error} label="Could not load enrolled faces" />}
      {!isLoading && !isError && faces.length === 0 && (
        <EmptyState label="No faces enrolled yet." />
      )}

      <div className="space-y-2">
        {faces.map((face) => (
          <div
            key={face.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
          >
            <p className="text-sm font-medium text-slate-800">{face.name}</p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Remove "${face.name}" from enrolled faces?`)) {
                  deleteMutation.mutate(face.id);
                }
              }}
              className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
