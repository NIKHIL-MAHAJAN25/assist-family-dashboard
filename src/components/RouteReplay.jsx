import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Circle, CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { fetchLogEntries } from '../api/logEntries.js';
import { usePatientId, useZones } from '../lib/hooks.js';
import { walkPoints } from '../lib/story.js';
import { formatTime } from '../utils/datetime.js';
import { formatDistance, haversineMeters } from '../utils/geo.js';
import { Icon, cx } from '../ui';

// Replay a walk (#11): the phone's location pings for a window, drawn as a route that animates step by
// step — the marker moves along it, the trail fills in behind, the clock shows the real time of each
// point, and the moments they left and came back are marked on the way.

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const PLAY_MS = 14000; // the whole walk plays in ~14 s, however long it really took

const WINDOWS = [
  ['last_outing', 'Last time outside'],
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
];

const walker = (initial) =>
  L.divIcon({ className: '', html: `<span class="map-now"><i></i><b>${initial}</b></span>`, iconSize: [44, 44], iconAnchor: [22, 22] });

function Fit({ points, zones, k }) {
  const map = useMap();
  useEffect(() => {
    const pts = points.map((p) => [p.lat, p.lng]);
    zones.forEach((z) => {
      const r = z.radiusMeters / 111320;
      pts.push([z.centerLat - r, z.centerLng - r], [z.centerLat + r, z.centerLng + r]);
    });
    if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [36, 36], maxZoom: 17 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);
  return null;
}

/** Position and clock time at progress p ∈ [0, n-1] (equal screen time per step). */
function at(points, p) {
  const i = Math.min(points.length - 1, Math.floor(p));
  const j = Math.min(points.length - 1, i + 1);
  const f = p - i;
  const a = points[i];
  const b = points[j];
  return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f, t: new Date(a.t.getTime() + (b.t - a.t) * f), inside: f < 0.5 ? a.inside : b.inside };
}

export default function RouteReplay({ firstName = 'Them', initialWindow = 'last_outing', height = 420, compact = false, autoPlay = false }) {
  const patientId = usePatientId();
  const zones = useZones();
  const [win, setWin] = useState(initialWindow);
  const since = useMemo(() => {
    const d = new Date(Date.now() - 7 * 86400000);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);
  const pings = useQuery({
    queryKey: ['entries', patientId, 'geofence-week'],
    queryFn: () => fetchLogEntries({ patientId, type: 'geofence', from: since }),
    enabled: Boolean(patientId),
    refetchInterval: 30000,
  });
  const points = useMemo(() => walkPoints(pings.data, win), [pings.data, win]);
  const [p, setP] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(null);
  const n = points.length;

  // New window or new data: rewind (and play straight away when asked to).
  useEffect(() => {
    setP(0);
    setPlaying(autoPlay && n > 1);
  }, [win, n, autoPlay]);

  useEffect(() => {
    if (!playing || n < 2) return undefined;
    let last = performance.now();
    const step = (now) => {
      const dt = now - last;
      last = now;
      setP((x) => {
        const next = x + (dt / PLAY_MS) * (n - 1);
        if (next >= n - 1) {
          setPlaying(false);
          return n - 1;
        }
        return next;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, n]);

  // A new window can be shorter than where the last one stopped: clamp until the rewind lands.
  const pc = Math.max(0, Math.min(p, n - 1));
  const here = n ? at(points, pc) : null;
  const done = Math.floor(pc);
  const trail = n ? [...points.slice(0, done + 1).map((x) => [x.lat, x.lng]), [here.lat, here.lng]] : [];
  const marks = useMemo(() => {
    const out = [];
    for (let i = 1; i < n; i++) {
      if (points[i - 1].inside && !points[i].inside) out.push({ i, kind: 'left', pt: points[i] });
      if (!points[i - 1].inside && points[i].inside) out.push({ i, kind: 'back', pt: points[i] });
    }
    return out;
  }, [points, n]);
  const distance = useMemo(() => points.slice(1).reduce((s, x, i) => s + haversineMeters(points[i].lat, points[i].lng, x.lat, x.lng), 0), [points]);
  const mins = n > 1 ? Math.round((points[n - 1].t - points[0].t) / 60000) : 0;
  const zoneList = zones.data || [];

  function toggle() {
    if (pc >= n - 1) setP(0);
    setPlaying((v) => !v);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[18px] bg-white ring-1 ring-black/[0.05]">
      <div className={cx('flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.05]', compact ? 'px-3 py-2' : 'px-4 py-3')}>
        <div className="flex gap-1 rounded-full bg-black/[0.04] p-1">
          {WINDOWS.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setWin(k)} className={cx('rounded-full px-3 py-1 text-[12px] font-semibold transition', win === k ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink')}>
              {label}
            </button>
          ))}
        </div>
        {n > 1 && (
          <span className="text-[12px] text-ink-3">
            {formatTime(points[0].t)}–{formatTime(points[n - 1].t)} · {mins} min · {formatDistance(distance)}
          </span>
        )}
      </div>

      <div className="relative min-h-0 flex-1" style={{ height }}>
        {pings.isLoading ? (
          <p className="grid h-full place-items-center text-[13px] text-ink-3">Loading the route…</p>
        ) : n < 2 ? (
          <div className="grid h-full place-items-center p-6 text-center">
            <div>
              <Icon name="walk" size={26} className="mx-auto text-ink-3" />
              <p className="mt-2 text-[14px] font-semibold">
                {win === 'last_outing' ? `${firstName} hasn’t left the safe places in the last week.` : 'No walk recorded for this day.'}
              </p>
              <p className="mt-1 text-[12px] text-ink-3">The phone sends its location every minute; a route appears once there are a few points.</p>
            </div>
          </div>
        ) : (
          <MapContainer center={[points[0].lat, points[0].lng]} zoom={16} className="assist-map h-full w-full" style={{ height: '100%' }} scrollWheelZoom={!compact}>
            <TileLayer url={TILE_URL} attribution={TILE_ATTR} className="map-base" maxZoom={19} />
            <Fit points={points} zones={zoneList} k={`${win}-${n}`} />
            {zoneList.map((z) => (
              <Circle key={z.id} center={[z.centerLat, z.centerLng]} radius={z.radiusMeters} pathOptions={{ color: '#9ACF63', weight: 2, dashArray: '1 7', lineCap: 'round', fillColor: '#BDE58F', fillOpacity: 0.3 }}>
                <Tooltip permanent direction="center" className="zone-label">{z.name}</Tooltip>
              </Circle>
            ))}
            <Polyline positions={points.map((x) => [x.lat, x.lng])} pathOptions={{ color: '#1E1C1A', weight: 3, opacity: 0.25, dashArray: '0.1 8', lineCap: 'round' }} />
            <Polyline positions={trail} pathOptions={{ color: '#1E1C1A', weight: 4, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }} />
            {marks.map((m) => (
              <CircleMarker key={m.i} center={[m.pt.lat, m.pt.lng]} radius={7} pathOptions={{ color: '#FBF7EE', weight: 2, fillColor: m.kind === 'left' ? '#E2856C' : '#9ACF63', fillOpacity: done >= m.i ? 1 : 0.35 }}>
                <Tooltip direction="top" permanent={!compact}>{m.kind === 'left' ? 'Left' : 'Back'} · {formatTime(m.pt.t)}</Tooltip>
              </CircleMarker>
            ))}
            <Marker position={[here.lat, here.lng]} icon={walker((firstName || '•').charAt(0).toUpperCase())} zIndexOffset={1000} />
          </MapContainer>
        )}
        {here && n > 1 && (
          <div className="pointer-events-none absolute right-3 top-3 z-[500] rounded-[14px] bg-white/95 px-3 py-2 shadow-sm ring-1 ring-black/[0.06]">
            <p className="font-serif text-[22px] leading-none">{formatTime(here.t)}</p>
            <p className={cx('mt-1 text-[11px] font-semibold', here.inside ? 'text-ok' : 'text-act')}>{here.inside ? 'Inside a safe place' : 'Outside the safe places'}</p>
          </div>
        )}
      </div>

      {n > 1 && (
        <div className={cx('flex items-center gap-3 border-t border-black/[0.05]', compact ? 'px-3 py-2' : 'px-4 py-3')}>
          <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white hover:bg-black">
            <Icon name={playing ? 'pause' : 'play'} size={16} strokeWidth={2.2} />
          </button>
          <input
            type="range"
            min={0}
            max={n - 1}
            step={0.01}
            value={pc}
            onChange={(e) => { setPlaying(false); setP(Number(e.target.value)); }}
            className="min-w-0 flex-1 accent-ink"
            aria-label="Position in the walk"
          />
          <span className="w-12 shrink-0 text-right text-[12px] tabular-nums text-ink-3">{done + 1}/{n}</span>
        </div>
      )}
    </div>
  );
}
