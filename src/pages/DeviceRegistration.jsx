import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { registerDevice } from '../api/devices';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader, Card, SectionTitle, Field, SelectField, Button, Icon, ErrorBanner } from '../ui';

const DEVICE_TYPES = [
  { value: 'esp32cam', label: 'ESP32-CAM' },
  { value: 'watch', label: 'Watch' },
];

export default function DeviceRegistration() {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState(user?.patient_id || '');
  const [deviceType, setDeviceType] = useState('esp32cam');
  const [identifier, setIdentifier] = useState('');
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: () => registerDevice({ patientId, deviceType, identifier }),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setCopied(false);
    mutation.mutate();
  }

  async function handleCopy() {
    if (!mutation.data?.api_key) return;
    try {
      await navigator.clipboard.writeText(mutation.data.api_key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        eyebrow="Setup"
        title="Register a device"
        description="Pairs a camera or watch with this patient and hands you back a key — copy it into the device once, and it's set for good."
      />

      <Card emphasis bodyClassName="p-6">
        <SectionTitle>Device details</SectionTitle>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field
            label="Patient ID"
            mono
            required
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
          />
          <SelectField
            label="Device type"
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value)}
          >
            {DEVICE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </SelectField>
          <Field
            label="Identifier"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="serial number or MAC address"
          />

          {mutation.isError && (
            <ErrorBanner error={mutation.error} label="Could not register device" />
          )}

          <Button type="submit" size="lg" loading={mutation.isPending} icon="plus">
            {mutation.isPending ? 'Registering…' : 'Register device'}
          </Button>
        </form>
      </Card>

      {mutation.isSuccess && (
        <Card accent="attend" className="mt-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-attend-bg text-attend-fg">
              <Icon name="warning" size={20} />
            </span>
            <p className="font-display text-[19px] font-semibold text-ink">Copy this key now</p>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-faint">
            Only a hash of this key is stored on the server. If it's lost, you'll need to register
            a new device.
          </p>
          <code className="mt-3 block break-all rounded-card border border-line bg-surface-sunken px-4 py-3 font-mono text-[13px] text-ink">
            {mutation.data.api_key}
          </code>
          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              icon={copied ? 'check' : 'copy'}
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy key'}
            </Button>
          </div>
          <p className="mt-4 font-mono text-[12.5px] text-ink-faint">
            Device ID: {mutation.data.device_id}
          </p>
        </Card>
      )}
    </div>
  );
}
