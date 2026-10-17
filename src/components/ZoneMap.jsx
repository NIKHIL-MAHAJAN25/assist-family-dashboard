import React, { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Circle,
  CircleMarker,
  Marker,
  Polyline,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';

// OpenStreetMap tiles, recoloured to warm paper in index.css (.map-base) so the sage zones,
// the ink path and the rose "now" marker carry all the colour.
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Where they are now: their initial on ink, inside a soft rose pulse.
const nowIcon = (initial) =>
  L.divIcon({
    className: '',
    html: `<span class="map-now"><i></i><b>${initial}</b></span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });

const handleIcon = (color, cursor) =>
  L.divIcon({
    className: '',
    html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:${cursor}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
const centerHandle = handleIcon('#1E1C1A', 'move');
const edgeHandle = handleIcon('#9ACF63', 'ew-resize');

function offsetEast(lat, lng, meters) {
  const d = (meters / (6378137 * Math.cos((Math.PI * lat) / 180))) * (180 / Math.PI);
  return [lat, lng + d];
}

function FitBounds({ points, padding = 40, deps }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    map.fitBounds(L.latLngBounds(points), { padding: [padding, padding], maxZoom: 17 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps]);
  return null;
}

function ClickCatcher({ onClick }) {
  useMapEvents({ click: (e) => onClick?.({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export default function ZoneMap({
  zones = [],
  path = [],
  current,
  currentLabel,
  draft,
  onDraftChange,
  onMapClick,
  selectedId,
  onZoneClick,
  interactive = true,
  className,
  style,
  fitKey,
}) {
  const fitPoints = useMemo(() => {
    const pts = [];
    zones.forEach((z) => {
      const r = z.radiusMeters / 111320;
      pts.push([z.centerLat - r, z.centerLng - r], [z.centerLat + r, z.centerLng + r]);
    });
    path.forEach((p) => pts.push([p.lat, p.lng]));
    if (current) pts.push([current.lat, current.lng]);
    return pts;
  }, [zones, path, current]);

  const center = fitPoints[0] || [12.9716, 77.6412];

  return (
    <MapContainer
      center={center}
      zoom={15}
      zoomControl={interactive}
      scrollWheelZoom={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      attributionControl
      className={['assist-map', className].filter(Boolean).join(' ')}
      style={style}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTR} className="map-base" maxZoom={19} />
      <FitBounds points={fitPoints} deps={fitKey ?? fitPoints.length} />
      {onMapClick && <ClickCatcher onClick={onMapClick} />}

      {zones.map((z) => {
        const selected = z.id === selectedId;
        return (
          <Circle
            key={z.id}
            center={[z.centerLat, z.centerLng]}
            radius={z.radiusMeters}
            pathOptions={{
              color: selected ? '#151515' : '#9ACF63',
              weight: selected ? 2.5 : 2,
              dashArray: selected ? null : '1 7',
              lineCap: 'round',
              fillColor: '#BDE58F',
              fillOpacity: selected ? 0.42 : 0.3,
            }}
            eventHandlers={onZoneClick ? { click: () => onZoneClick(z) } : undefined}
          >
            <Tooltip permanent direction="center" className="zone-label">
              {z.name}
            </Tooltip>
          </Circle>
        );
      })}

      {path.length > 1 && (
        <Polyline
          positions={path.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: '#1E1C1A', weight: 3, opacity: 0.75, dashArray: '0.1 9', lineCap: 'round' }}
        />
      )}
      {path.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.lat, p.lng]}
          radius={p.flagged ? 7 : 4.5}
          pathOptions={{
            color: '#FBF7EE',
            weight: 2,
            fillColor: p.flagged ? '#E2856C' : '#1E1C1A',
            fillOpacity: 1,
          }}
        >
          {p.label && <Tooltip direction="top">{p.label}</Tooltip>}
        </CircleMarker>
      ))}

      {current && (
        <Marker position={[current.lat, current.lng]} icon={nowIcon((currentLabel || '•').charAt(0).toUpperCase())} zIndexOffset={1000} />
      )}

      {draft && (
        <>
          <Circle
            center={[draft.lat, draft.lng]}
            radius={draft.radius}
            pathOptions={{ color: '#1E1C1A', weight: 2, dashArray: '6 6', fillColor: '#A9D4F5', fillOpacity: 0.35 }}
          />
          <Marker
            position={[draft.lat, draft.lng]}
            icon={centerHandle}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                onDraftChange?.({ ...draft, lat, lng });
              },
            }}
          />
          <Marker
            position={offsetEast(draft.lat, draft.lng, draft.radius)}
            icon={edgeHandle}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const r = L.latLng(draft.lat, draft.lng).distanceTo(e.target.getLatLng());
                onDraftChange?.({ ...draft, radius: Math.max(20, Math.round(r)) });
              },
            }}
          />
        </>
      )}
    </MapContainer>
  );
}
