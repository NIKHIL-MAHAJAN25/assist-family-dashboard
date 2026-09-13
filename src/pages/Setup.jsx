import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchGeofenceZones } from '../api/geofenceZones';
import { fetchEnrolledFaces } from '../api/enrolledFaces';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader, Card, Icon } from '../ui';

const ROWS = [
  {
    to: '/geofences',
    icon: 'shield',
    name: 'Safe zones',
    description: "The places it's safe to be — leaving one of these sends an alert.",
    countKey: 'zones',
  },
  {
    to: '/faces',
    icon: 'faces',
    name: 'Familiar faces',
    description: 'People enrolled so they show up by name in the daily record.',
    countKey: 'faces',
  },
  {
    to: '/devices/register',
    icon: 'device',
    name: 'Devices',
    description: 'Pair a camera or watch so activity starts showing up automatically.',
    countKey: null,
  },
];

export default function Setup() {
  const { user } = useAuth();
  const patientId = user?.patient_id;

  // Same queryKeys GeofenceZones.jsx and Faces.jsx use, so a caregiver who has
  // already visited either page sees the count instantly from cache.
  const zonesQuery = useQuery({
    queryKey: ['geofence-zones', patientId],
    queryFn: () => fetchGeofenceZones(patientId),
    enabled: Boolean(patientId),
  });
  const facesQuery = useQuery({
    queryKey: ['enrolled-faces', patientId],
    queryFn: () => fetchEnrolledFaces(patientId),
    enabled: Boolean(patientId),
  });

  const counts = {
    zones: zonesQuery.data ? `${zonesQuery.data.length} ${zonesQuery.data.length === 1 ? 'zone' : 'zones'}` : null,
    faces: facesQuery.data ? `${facesQuery.data.length} ${facesQuery.data.length === 1 ? 'person' : 'people'}` : null,
  };

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Setup"
        description="Things you set up once, not things you need to check every day."
      />

      <div className="space-y-3">
        {ROWS.map((row) => (
          <Link key={row.to} to={row.to} className="block">
            <Card accent="sage" interactive>
              <div className="flex items-center gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-sage-100 text-sage-700">
                  <Icon name={row.icon} size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[18px] font-semibold text-ink">{row.name}</p>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-faint">{row.description}</p>
                </div>
                {row.countKey && counts[row.countKey] && (
                  <span className="shrink-0 text-[12.5px] font-bold text-ink-faint">
                    {counts[row.countKey]}
                  </span>
                )}
                <Icon name="chevronRight" size={18} className="shrink-0 text-ink-faint" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
