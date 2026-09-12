import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEnrolledFaces, createEnrolledFace, deleteEnrolledFace } from '../api/enrolledFaces';
import { useAuth } from '../context/AuthContext.jsx';
import { computeFaceDescriptor } from '../utils/faceApi';
import {
  PageHeader,
  Card,
  SectionTitle,
  Field,
  FileField,
  Button,
  IconButton,
  LoadingBanner,
  ErrorBanner,
  EmptyState,
} from '../ui';

function initialsOf(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function Faces() {
  const { user } = useAuth();
  const patientId = user?.patient_id;
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [formError, setFormError] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrolled-faces', patientId] });
      setConfirmDeleteId(null);
    },
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
      <PageHeader
        eyebrow="Recognition"
        title="Familiar faces"
        description="Enroll up to six family members so they're recognised as themselves, not a stranger, in the daily record."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_1fr] xl:items-start">
        <Card emphasis className="xl:sticky xl:top-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <SectionTitle>Add someone</SectionTitle>

            <Field
              label="Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah (daughter)"
            />

            <FileField
              label="Reference photo"
              accept="image/*"
              required
              fileName={file?.name}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              hint="The face descriptor is computed in your browser; only the resulting numbers are sent to the server, not the photo itself."
            />

            {formError && <ErrorBanner error={{ message: formError }} label="Could not enroll face" />}

            <Button type="submit" loading={processing || createMutation.isPending}>
              {processing ? 'Processing photo…' : 'Enroll face'}
            </Button>
          </form>
        </Card>

        <div>
          {isLoading && <LoadingBanner label="Loading enrolled faces…" />}
          {isError && <ErrorBanner error={error} label="Could not load enrolled faces" />}
          {!isLoading && !isError && faces.length === 0 && (
            <EmptyState
              icon="faces"
              label="No faces added yet"
              hint="Enroll the people who visit most so they're recognised by name."
            />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {faces.map((face) => {
              const confirming = confirmDeleteId === face.id;
              return (
                <Card key={face.id} accent="sage">
                  {confirming ? (
                    <div className="space-y-3">
                      <p className="text-[13.5px] font-bold text-ink-soft">Remove {face.name}?</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(face.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-sage text-[14px] font-bold text-white">
                        {initialsOf(face.name)}
                      </span>
                      <p className="min-w-0 flex-1 truncate font-display text-[18px] font-semibold text-ink">
                        {face.name}
                      </p>
                      <IconButton
                        icon="trash"
                        label="Remove face"
                        variant="danger"
                        onClick={() => setConfirmDeleteId(face.id)}
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
