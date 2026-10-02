import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { registerDevice } from '../api/devices.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, ErrorNote, Field, Icon, PageTitle, Panel, Segmented } from '../ui';

function Copyable({ value, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded border border-line bg-subtle px-3 py-2 font-mono text-sm text-ink">
        {value}
      </code>
      <Button
        size="sm"
        icon={copied ? 'check' : 'copy'}
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        aria-label={`Copy ${label}`}
      >
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}

function RegisterDevice({ patientId }) {
  const [type, setType] = useState('esp32cam');
  const [name, setName] = useState('');
  const reg = useMutation({ mutationFn: registerDevice });

  if (reg.data) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded border border-watch-line bg-watch-soft p-3 text-sm text-watch">
          <Icon name="warning" size={17} className="mt-0.5 shrink-0" />
          <span>
            <strong>Copy the key now — it won't be shown again.</strong> Only a scrambled version is
            stored, so if it's lost the device has to be registered again.
          </span>
        </div>
        <Field label="Device ID">
          <Copyable value={reg.data.device_id} label="device ID" />
        </Field>
        <Field label="Device key">
          <Copyable value={reg.data.api_key} label="device key" />
        </Field>
        <Button onClick={() => { reg.reset(); setName(''); }}>Register another</Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        reg.mutate({ patientId, deviceType: type, identifier: name.trim() });
      }}
    >
      <Field label="Type of device">
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: 'esp32cam', label: 'Home camera / phone' },
            { value: 'watch', label: 'Watch' },
          ]}
        />
      </Field>
      <Field label="Nickname">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Living room camera" required />
      </Field>
      {reg.isError && <ErrorNote error={reg.error} />}
      <Button type="submit" variant="primary" loading={reg.isPending} disabled={!name.trim()}>
        Register device
      </Button>
    </form>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  return (
    <>
      <PageTitle title="Settings" subtitle="Devices, the patient record, and your account." />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <Panel title="Set up the companion phone">
          <ol className="space-y-3 text-base text-ink-2">
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">1</span>
              Install the Assist app on {user?.patient_name ? `${user.patient_name}'s` : 'the'} phone and open it.
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">2</span>
              When it asks for a patient ID, enter this one:
            </li>
          </ol>
          <div className="mt-3 pl-9">
            <Copyable value={user?.patient_id || ''} label="patient ID" />
          </div>
          <p className="mt-3 pl-9 text-sm text-ink-3">
            The phone registers itself and then relays the home camera and its own location.
          </p>
        </Panel>

        <Panel title="Register a device manually">
          <p className="mb-4 text-sm text-ink-3">
            For a camera or watch that connects to the server directly instead of through the phone.
          </p>
          <RegisterDevice patientId={user?.patient_id} />
        </Panel>

        <Panel title="Your account">
          <dl className="space-y-3 text-base">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-3">Name</dt>
              <dd className="font-semibold">{user?.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-3">Role</dt>
              <dd className="font-semibold">Family caregiver</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-3">Caring for</dt>
              <dd className="font-semibold">{user?.patient_name || '—'}</dd>
            </div>
          </dl>
          <Button className="mt-5" icon="logout" onClick={logout}>
            Sign out
          </Button>
        </Panel>

        <Panel title="Privacy">
          <ul className="space-y-2.5 text-base text-ink-2">
            {[
              'Camera photos are deleted after 7 days unless you bookmark them in the log.',
              'The written description of each moment is kept so the day can still be recalled.',
              'Face photos stay in your browser — only a numeric fingerprint is stored.',
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <Icon name="shield" size={17} className="mt-0.5 shrink-0 text-ok" />
                {t}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
