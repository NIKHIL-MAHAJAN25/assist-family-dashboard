import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Default Leaflet marker icons reference image assets by relative URL, which
// breaks under Vite's bundling. Simple colored divIcons sidestep that
// entirely instead of wiring up the marker-icon asset paths.
const centerIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#0284c7;border:2px solid white;box-shadow:0 0 0 1px #0284c7;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const edgeIcon = L.divIcon({
  className: '',
  html: '<div style="width:12px;height:12px;border-radius:50%;background:#f97316;border:2px solid white;box-shadow:0 0 0 1px #f97316;cursor:ew-resize;"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// Offsets a lat/lng due east by `meters`, used to place the draggable radius
// handle on the circle's edge.
function offsetEast(lat, lng, meters) {
  const earthRadius = 6378137;
  const deltaLng = (meters / (earthRadius * Math.cos((Math.PI * lat) / 180))) * (180 / Math.PI);
  return { lat, lng: lng + deltaLng };
}

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function GeofenceMap({ center, radiusMeters, onCenterChange, onRadiusChange }) {
  const edgePosition = useMemo(
    () => offsetEast(center.lat, center.lng, radiusMeters),
    [center.lat, center.lng, radiusMeters]
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={15}
      style={{ height: '360px', width: '100%', borderRadius: '0.5rem' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onMapClick={(latlng) => onCenterChange({ lat: latlng.lat, lng: latlng.lng })} />

      <Circle
        center={[center.lat, center.lng]}
        radius={radiusMeters}
        pathOptions={{ color: '#0284c7', fillColor: '#0284c7', fillOpacity: 0.15 }}
      />

      <Marker
        position={[center.lat, center.lng]}
        icon={centerIcon}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const { lat, lng } = e.target.getLatLng();
            onCenterChange({ lat, lng });
          },
        }}
      />

      <Marker
        position={[edgePosition.lat, edgePosition.lng]}
        icon={edgeIcon}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const dragged = e.target.getLatLng();
            const centerLatLng = L.latLng(center.lat, center.lng);
            const newRadius = Math.max(5, Math.round(centerLatLng.distanceTo(dragged)));
            onRadiusChange(newRadius);
          },
        }}
      />
    </MapContainer>
  );
}
