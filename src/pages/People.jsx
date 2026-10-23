import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createEnrolledFace, deleteEnrolledFace, fetchEnrolledFaces } from '../api/enrolledFaces.js';
import { usePatientId } from '../lib/hooks.js';
import { computeFaceDescriptor } from '../utils/faceApi.js';
import { formatDateTime, formatTime } from '../utils/datetime.js';
import { apiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar, Button, Empty, ErrorNote, Field, Icon, IconButton, Loading, PageTitle, Panel } from '../ui';

const MAX_PEOPLE = 6;

/** "Raj (son)" -> { name: "Raj", relation: "son" }; plain names have no relation. */
function splitName(full) {
  const m = /^(.*?)\s*\((.+)\)\s*$/.exec(full || '');
  return m ? { name: m[1], relation: m[2] } : { name: full, relation: null };
}

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

/** "Seen today at 2:35 pm, eating lunch · 3 times this week", or a quiet "not seen" line. */
function LastSeen({ s }) {
  if (!s) return null;
  if (!s.last_seen_at) return <p className="mt-1.5 text-xs text-ink-4">Not seen by the camera this week</p>;
  const when = new Date(s.last_seen_at);
  const today = new Date().toDateString() === when.toDateString();
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-2">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ok" />
      <span className="truncate">
        Seen {today ? `today at ${formatTime(when)}` : formatDateTime(when)}
        {s.times_seen_7d > 1 ? ` · ${s.times_seen_7d} times this week` : ''}
      </span>
    </p>
  );
}

export default function People() {
  const patientId = usePatientId();
  const { user } = useAuth();
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

  // When the home camera last recognised each person, and the "say who's there" switch.
  const seen = useQuery({
    queryKey: ['people-seen', patientId],
    queryFn: async () => (await apiClient.get(`/api/patients/${patientId}/people-seen`)).data,
    enabled: Boolean(patientId),
    refetchInterval: 30000,
  });
  const settings = useQuery({
    queryKey: ['face-settings', patientId],
    queryFn: async () => (await apiClient.get(`/api/patients/${patientId}/face-settings`)).data,
    enabled: Boolean(patientId),
  });
  const setAnnounce = useMutation({
    mutationFn: async (announce) => (await apiClient.put(`/api/patients/${patientId}/face-settings`, { announce })).data,
    onSuccess: (data) => qc.setQueryData(['face-settings', patientId], data),
  });
  const seenById = new Map((seen.data || []).map((s) => [s.face_id, s]));
  const firstName = (user?.patient_name || '').split(' ')[0] || 'them';

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
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {list.map((f) => (
            <li key={f.id} className="panel group flex items-center gap-4 p-4 transition-shadow hover:shadow-sm">
              <span className="rounded-full p-[3px] ring-1 ring-line transition group-hover:ring-ink-4">
                <Avatar name={f.name} size={52} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-md font-semibold">{splitName(f.name).name}</p>
                <div className="mt-1 flex items-center gap-2">
                  {splitName(f.name).relation && (
                    <span className="rounded-sm bg-accent-soft px-1.5 py-0.5 text-xs font-semibold capitalize text-accent">
                      {splitName(f.name).relation}
                    </span>
                  )}
                  <span className="text-xs text-ink-4">Added {formatDateTime(f.createdAt)}</span>
                </div>
                <LastSeen s={seenById.get(f.id)} />
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

      <Panel title="When the camera recognises someone" className="mt-8">
        <ul className="mb-5 space-y-2 text-sm text-ink-2">
          <li className="flex gap-2"><Icon name="check" size={16} className="mt-0.5 shrink-0 text-ok" />The moment in the log says who was there, and the Assistant knows who visited.</li>
          <li className="flex gap-2"><Icon name="check" size={16} className="mt-0.5 shrink-0 text-ok" />The family gets a quiet note: “Sarah was seen at home with {firstName}”, once every two hours at most.</li>
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-md bg-subtle px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Say who’s there on {firstName}’s phone</p>
            <p className="text-sm text-ink-3">
              For example “{firstName}, Sarah, your daughter, is here to see you.” Off by default: a wrong name said aloud is worse than none,
              so turn it on once the camera has recognised everyone correctly a few times.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(settings.data?.announce)}
            disabled={!settings.data || setAnnounce.isPending}
            onClick={() => setAnnounce.mutate(!settings.data?.announce)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${settings.data?.announce ? 'bg-ink' : 'bg-black/15'} disabled:opacity-50`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${settings.data?.announce ? 'left-6' : 'left-1'}`} />
            <span className="sr-only">Say who’s there on {firstName}’s phone</span>
          </button>
        </div>
        {settings.data && !settings.data.recognition && <p className="mt-3 text-sm text-act">Face recognition is turned off on the server.</p>}
      </Panel>
    </>
  );
}
