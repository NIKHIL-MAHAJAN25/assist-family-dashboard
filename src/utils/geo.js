// Pure geo helpers for reading geofence log entry payloads. No API calls, no
// React — just field extraction. Overall "where are they right now" state
// comes from the server's /api/patients/:id/status endpoint; what's left here
// is only what the Today episode spine needs to describe a single past entry.

// The API contract only pins down the `frame` payload shape (see README.md /
// LogEntrySummary.jsx) — geofence payload field names aren't guaranteed, so
// this reads every plausible spelling rather than assuming one.

/** Reads the inside-safe-zone boolean out of a geofence entry's payload, or
 * null when the payload doesn't carry a recognisable one. */
export function extractInsideSafeZone(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const candidates = [
    payload.inside_safe_zone,
    payload.insideSafeZone,
    payload.is_inside_safe_zone,
    payload.isInsideSafeZone,
    payload.inside,
    payload.is_safe,
    payload.isSafe,
    payload.within_safe_zone,
    payload.withinSafeZone,
  ];
  const found = candidates.find((value) => typeof value === 'boolean');
  return typeof found === 'boolean' ? found : null;
}

/** Reads latitude/longitude off a geofence entry's payload, or null when
 * neither is present as a number. */
export function extractLatLng(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const lat = [payload.lat, payload.latitude].find((v) => typeof v === 'number');
  const lng = [payload.lng, payload.lon, payload.long, payload.longitude].find((v) => typeof v === 'number');
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { lat, lng };
}

/** A zone's name, when the payload happens to carry one directly (some
 * backends echo the matched zone back on the entry itself). */
export function extractZoneName(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const candidates = [payload.zone_name, payload.zoneName, payload.safe_zone_name, payload.matched_zone_name];
  const found = candidates.find((v) => typeof v === 'string' && v.trim());
  return found || null;
}

function zoneCenter(zone) {
  const lat = zone.center_lat ?? zone.centerLat;
  const lng = zone.center_lng ?? zone.centerLng;
  return typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null;
}

/** Great-circle distance between two lat/lng points, in metres. */
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** The zone whose radius actually contains `coords`, preferring the closest
 * such zone when more than one overlaps. Null if none contains it. */
export function findContainingZone(coords, zones) {
  let best = null;
  for (const zone of zones || []) {
    const center = zoneCenter(zone);
    const radius = zone.radius_meters ?? zone.radiusMeters;
    if (!center || typeof radius !== 'number') continue;
    const distanceMeters = haversineMeters(coords.lat, coords.lng, center.lat, center.lng);
    if (distanceMeters <= radius && (!best || distanceMeters < best.distanceMeters)) {
      best = { zone, distanceMeters };
    }
  }
  return best;
}

/** The single closest zone to `coords`, regardless of its radius. Null when
 * no zone has usable coordinates. */
export function nearestZone(coords, zones) {
  let best = null;
  for (const zone of zones || []) {
    const center = zoneCenter(zone);
    if (!center) continue;
    const distanceMeters = haversineMeters(coords.lat, coords.lng, center.lat, center.lng);
    if (!best || distanceMeters < best.distanceMeters) best = { zone, distanceMeters };
  }
  return best;
}

/** "320 m" under a kilometre, "1.4 km" beyond it — rounded to a sensible
 * unit rather than a raw metre count. */
export function formatDistance(meters) {
  if (meters < 1000) {
    const rounded = Math.max(10, Math.round(meters / 10) * 10);
    return `${rounded} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
