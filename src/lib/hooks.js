import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchLogEntries } from '../api/logEntries.js';
import { fetchGeofenceZones } from '../api/geofenceZones.js';
import { fetchPatientStatus } from '../api/status.js';
import { fetchQuizHistory } from '../api/quiz.js';

export function usePatientId() {
  return useAuth().user?.patient_id;
}

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useEntries({ from, to } = {}) {
  const patientId = usePatientId();
  return useQuery({
    queryKey: ['entries', patientId, from, to],
    queryFn: () =>
      fetchLogEntries({
        patientId,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      }),
    enabled: Boolean(patientId),
    refetchInterval: 30000,
  });
}

export function useZones() {
  const patientId = usePatientId();
  return useQuery({
    queryKey: ['zones', patientId],
    queryFn: () => fetchGeofenceZones(patientId),
    enabled: Boolean(patientId),
  });
}

export function useStatus() {
  const patientId = usePatientId();
  return useQuery({
    queryKey: ['status', patientId],
    queryFn: () => fetchPatientStatus(patientId),
    enabled: Boolean(patientId),
    refetchInterval: 30000,
  });
}

export function useQuizHistory() {
  const patientId = usePatientId();
  return useQuery({
    queryKey: ['quiz', patientId],
    queryFn: () => fetchQuizHistory(patientId),
    enabled: Boolean(patientId),
  });
}
