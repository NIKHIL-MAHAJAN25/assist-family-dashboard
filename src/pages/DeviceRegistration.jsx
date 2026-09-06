import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { registerDevice } from '../api/devices';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBanner } from '../components/StatusBanner.jsx';

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
    <div className="max-w-md">
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Register Device</h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-4 space-y-3"
      >
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Patient ID</label>
          <input
            required
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Device type</label>
          <select
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {DEVICE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Identifier</label>
          <input
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g. serial number or MAC address"
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>

        {mutation.isError && <ErrorBanner error={mutation.error} label="Could not register device" />}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {mutation.isPending ? 'Registering...' : 'Register device'}
        </button>
      </form>

      {mutation.isSuccess && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-900">
            Save this API key now — it will not be shown again.
          </p>
          <p className="text-xs text-amber-800">
            Only a hash of this key is stored on the server. If it's lost, you'll need to register
            a new device.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-md bg-white border border-amber-200 px-2 py-1.5 text-xs">
              {mutation.data.api_key}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Device ID: <span className="font-mono">{mutation.data.device_id}</span>
          </p>
        </div>
      )}
    </div>
  );
}
