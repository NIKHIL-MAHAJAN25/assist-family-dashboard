import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createEnrolledFace, deleteEnrolledFace, fetchEnrolledFaces } from '../api/enrolledFaces.js';
import { usePatientId } from '../lib/hooks.js';
import { computeFaceDescriptor } from '../utils/faceApi.js';
import { formatDateTime } from '../utils/datetime.js';
import { Avatar, Button, Empty, ErrorNote, Field, Icon, IconButton, Loading, PageTitle, Panel } from '../ui';

const MAX_PEOPLE = 6;

function AddPerson({ onDone, patientId }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [stage, setStage] = useState(null); // null | 'reading' | 'saving'
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const create = useMutation({ mutationFn: createEnrolledFace });

  async function submit(e) {
    e.preventDefault();
    setError(null);
    try {
      setStage('reading');
      const referenceEmbedding = await computeFaceDescriptor(file);
      setStage('saving');
      await create.mutateAsync({ patientId, name: name.trim(), referenceEmbedding });
      qc.invalidateQueries({ queryKey: ['faces'] });
      onDone();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not read that photo.');
    } finally {
      setStage(null);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-[180px_1fr]">
      <label className="group relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-md border-2 border-dashed border-line-strong bg-subtle text-center hover:border-ink-4">
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="px-3 text-sm text-ink-3">
            <Icon name="camera" size={24} className="mx-auto mb-2 text-ink-4" />
            Choose a clear, front-facing photo
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>
      <div className="space-y-4">
        <Field label="Name, as they'd say it" hint="This is what the phone would say aloud: “This is Raj, your son.”">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Raj (son)" required />
        </Field>
        <p className="flex items-start gap-2 rounded bg-subtle px-3 py-2.5 text-sm text-ink-3">
          <Icon name="shield" size={16} className="mt-0.5 shrink-0" />
          The photo never leaves this browser. Only a face fingerprint (128 numbers) is stored.
        </p>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={!file || !name.trim()} loading={Boolean(stage)}>
            {stage === 'reading' ? 'Reading face…' : stage === 'saving' ? 'Saving…' : 'Add person'}
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}

export default function People() {
  const patientId = usePatientId();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const faces = useQuery({
    queryKey: ['faces', patientId],
    queryFn: () => fetchEnrolledFaces(patientId),
    enabled: Boolean(patientId),
  });
  const remove = useMutation({
    mutationFn: deleteEnrolledFace,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faces'] });
      setConfirm(null);
    },
  });

  const list = faces.data || [];
  const full = list.length >= MAX_PEOPLE;

  return (
    <>
      <PageTitle
        title="Familiar people"
        subtitle={`Up to ${MAX_PEOPLE} people the camera should recognise. ${list.length} of ${MAX_PEOPLE} added.`}
        actions={
          !adding && (
            <Button variant="primary" icon="plus" disabled={full} onClick={() => setAdding(true)}>
              Add person
            </Button>
          )
        }
      />

      {adding && (
        <Panel title="Add someone" className="mb-6">
          <AddPerson patientId={patientId} onDone={() => setAdding(false)} />
        </Panel>
      )}

      {faces.isLoading ? (
        <Loading />
      ) : faces.isError ? (
        <ErrorNote error={faces.error} />
      ) : !list.length ? (
        <Panel>
          <Empty icon="people" title="No one added yet" action={<Button variant="primary" onClick={() => setAdding(true)}>Add the first person</Button>}>
            Add the family members and carers who visit most.
          </Empty>
        </Panel>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((f) => (
            <li key={f.id} className="panel flex items-center gap-4 p-4">
              <Avatar name={f.name} size={52} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-md font-semibold">{f.name}</p>
                <p className="text-sm text-ink-3">Added {formatDateTime(f.createdAt)}</p>
              </div>
              {confirm === f.id ? (
                <span className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Keep</Button>
                  <Button size="sm" variant="danger" loading={remove.isPending} onClick={() => remove.mutate(f.id)}>
                    Remove
                  </Button>
                </span>
              ) : (
                <IconButton icon="trash" label={`Remove ${f.name}`} onClick={() => setConfirm(f.id)} />
              )}
            </li>
          ))}
          {Array.from({ length: MAX_PEOPLE - list.length }).map((_, i) => (
            <li key={`slot-${i}`}>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex h-full min-h-[86px] w-full items-center justify-center gap-2 rounded-md border border-dashed border-line-strong text-sm font-semibold text-ink-3 hover:border-ink-4 hover:text-ink"
              >
                <Icon name="plus" size={16} /> Empty slot
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 max-w-2xl text-sm text-ink-3">
        <strong className="font-semibold text-ink-2">Coming next:</strong> matching these faces against
        the home camera, so the timeline says who visited and the phone can quietly say who's at the door.
      </p>
    </>
  );
}
