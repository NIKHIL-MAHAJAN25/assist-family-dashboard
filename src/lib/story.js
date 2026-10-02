// Turns raw log_entries into things a person would actually say about a day:
// merged stretches of activity, place changes, and grouped incidents.
import { findContainingZone, nearestZone, formatDistance } from '../utils/geo.js';

const ts = (e) => new Date(e.timestamp).getTime();

export const CATEGORIES = {
  meal: { label: 'Meals & drinks', color: '#7E9FC4', icon: 'clock' },
  rest: { label: 'Resting', color: '#C9C0B3', icon: 'home' },
  leisure: { label: 'TV, radio & reading', color: '#A898C8', icon: 'heart' },
  out: { label: 'Out walking', color: '#82AE8E', icon: 'walk' },
  unseen: { label: 'Not visible', color: '#C9705C', icon: 'warning' },
  other: { label: 'Quiet / no one in view', color: '#E3DCD1', icon: 'dot' },
};

export function categorize(activity = '') {
  const a = activity.toLowerCase();
  // "Not visible" is a safety signal; an empty room is just a quiet moment.
  if (/not visible|unknown/.test(a)) return 'unseen';
  if (/empty|no one|no activity/.test(a)) return 'other';
  if (/breakfast|lunch|dinner|eat|meal|tea|coffee|drink|cook|kitchen/.test(a)) return 'meal';
  if (/walk|outdoor|outside|park|garden/.test(a)) return 'out';
  if (/tele|tv|radio|read|book|music|newspaper/.test(a)) return 'leisure';
  if (/sit|rest|sleep|nap|lying|bed|relax/.test(a)) return 'rest';
  return 'other';
}

export function sentence(s) {
  if (!s) return '';
  const t = String(s).trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Where a geofence entry was, in words, relative to the caregiver's zones. */
export function placeOf(entry, zones) {
  const { lat, lng } = entry.payload || {};
  if (typeof lat !== 'number' || typeof lng !== 'number') return { label: 'Unknown location' };
  const inside = findContainingZone({ lat, lng }, zones);
  if (inside) return { label: inside.zone.name, zone: inside.zone, inside: true };
  const near = nearestZone({ lat, lng }, zones);
  if (near) {
    return {
      label: `${formatDistance(near.distanceMeters)} from ${near.zone.name}`,
      inside: false,
      near: near.zone,
    };
  }
  return { label: 'Outside every safe zone', inside: false };
}

/**
 * Merges consecutive frames with the same activity into one stretch, and collapses
 * location pings into place *changes* only. Returns oldest-first moments:
 *   { kind: 'activity', category, title, detail, start, end, count, entries, flagged, image }
 *   { kind: 'place', title, start, entries, inside, flagged }
 *   { kind: 'vitals', title, start, entries, flagged }
 */
export function buildMoments(entries, zones) {
  const sorted = [...entries].sort((a, b) => ts(a) - ts(b));
  const moments = [];
  let lastPlace = null;
  let lastPlaceMoment = null;

  for (const e of sorted) {
    const t = ts(e);
    if (e.entryType === 'frame') {
      const activity = e.payload?.activity || 'Unknown activity';
      const prev = moments[moments.length - 1];
      if (prev && prev.kind === 'activity' && prev.title.toLowerCase() === sentence(activity).toLowerCase()) {
        prev.end = t;
        prev.count += 1;
        prev.entries.push(e);
        prev.flagged ||= e.requiresAttention;
        prev.image ||= e.imagePublicId;
        if (e.payload?.person_state) prev.detail = sentence(e.payload.person_state);
        continue;
      }
      moments.push({
        kind: 'activity',
        category: categorize(activity),
        title: sentence(activity),
        detail: sentence(e.payload?.person_state),
        objects: e.payload?.objects_of_note || [],
        start: t,
        end: t,
        count: 1,
        entries: [e],
        flagged: e.requiresAttention,
        image: e.imagePublicId,
        confidence: e.payload?.confidence,
      });
    } else if (e.entryType === 'geofence') {
      const place = placeOf(e, zones);
      const key = place.inside ? place.zone.id : 'outside';
      if (key === lastPlace && lastPlaceMoment) {
        // Same place as the last ping: extend that stretch instead of adding a row per ping.
        lastPlaceMoment.end = t;
        lastPlaceMoment.count += 1;
        lastPlaceMoment.entries.push(e);
        lastPlaceMoment.flagged ||= e.requiresAttention;
        if (!place.inside) lastPlaceMoment.title = `Outside the safe zones — ${place.label}`;
        continue;
      }
      const wasOutside = lastPlace === 'outside';
      lastPlace = key;
      lastPlaceMoment = {
        kind: 'place',
        title: place.inside
          ? wasOutside
            ? `Back inside ${place.label}`
            : `At ${place.label}`
          : `Outside the safe zones — ${place.label}`,
        start: t,
        end: t,
        count: 1,
        countLabel: 'location readings',
        entries: [e],
        inside: place.inside,
        flagged: e.requiresAttention,
      };
      moments.push(lastPlaceMoment);
    } else if (e.entryType === 'heartrate') {
      const p = e.payload || {};
      if (!e.requiresAttention && p.scenario === 'normal') continue;
      moments.push({
        kind: 'vitals',
        title: `Heart rate ${p.heart_rate ?? '—'} bpm${p.scenario && p.scenario !== 'normal' ? ` · ${p.scenario}` : ''}`,
        start: t,
        end: t,
        entries: [e],
        flagged: e.requiresAttention,
      });
    }
  }
  return moments;
}

/**
 * Flagged entries that sit within `gapMin` minutes of each other are one incident,
 * not N separate alerts. Each incident also reports how it ended, if it did.
 */
export function buildIncidents(entries, zones, gapMin = 45) {
  const sorted = [...entries].sort((a, b) => ts(a) - ts(b));
  const flagged = sorted.filter((e) => e.requiresAttention);
  const groups = [];
  for (const e of flagged) {
    const g = groups[groups.length - 1];
    if (g && ts(e) - g.end <= gapMin * 60000) {
      g.entries.push(e);
      g.end = ts(e);
    } else {
      groups.push({ entries: [e], start: ts(e), end: ts(e) });
    }
  }

  return groups.map((g) => {
    const hasGeo = g.entries.some((e) => e.entryType === 'geofence');
    const hasUnseen = g.entries.some((e) => categorize(e.payload?.activity) === 'unseen');
    const hasVitals = g.entries.some((e) => e.entryType === 'heartrate');
    const title = hasGeo
      ? 'Wandered outside the safe zones'
      : hasVitals
        ? 'Unusual heart rate'
        : hasUnseen
          ? 'Not visible on the camera'
          : sentence(g.entries[0].payload?.activity) || 'Flagged by the system';

    // Resolution: the first in-zone ping after the incident's last flagged entry.
    const after = sorted.find(
      (e) => ts(e) > g.end && e.entryType === 'geofence' && placeOf(e, zones).inside
    );
    const resolved = after ? { at: ts(after), place: placeOf(after, zones).label } : null;

    const steps = g.entries.map((e) => ({
      at: ts(e),
      text:
        e.entryType === 'geofence'
          ? placeOf(e, zones).label
          : e.entryType === 'heartrate'
            ? `Heart rate ${e.payload?.heart_rate} bpm`
            : sentence(e.payload?.activity),
      kind: e.entryType,
      entry: e,
    }));
    // Consecutive location readings become one step: "13 readings, 9:33–9:45".
    const compact = [];
    for (const st of steps) {
      const prev = compact[compact.length - 1];
      if (prev && prev.kind === 'geofence' && st.kind === 'geofence') {
        prev.until = st.at;
        prev.count = (prev.count || 1) + 1;
        prev.text = st.text;
      } else {
        compact.push({ ...st });
      }
    }
    steps.length = 0;
    steps.push(...compact);
    if (resolved) steps.push({ at: resolved.at, text: `Back at ${resolved.place}`, kind: 'resolved' });

    const lastFix = [...g.entries].reverse().find((e) => e.entryType === 'geofence');
    return {
      id: g.entries[0].id,
      title,
      start: g.start,
      end: resolved ? resolved.at : g.end,
      entries: g.entries,
      steps,
      resolved,
      acknowledged: g.entries.every((e) => e.acknowledgedAt),
      lastFix: lastFix ? { lat: lastFix.payload.lat, lng: lastFix.payload.lng } : null,
    };
  });
}

/** 24h segments for the day ribbon: each activity stretch extends to the next moment. */
export function ribbonSegments(moments, dayStart, dayEnd, now) {
  const acts = moments.filter((m) => m.kind === 'activity');
  const limit = Math.min(dayEnd, now);
  return acts.map((m, i) => {
    const next = acts[i + 1];
    const end = Math.min(next ? next.start : m.end + 10 * 60000, limit);
    return {
      start: Math.max(m.start, dayStart),
      end: Math.max(end, m.start + 3 * 60000),
      category: m.flagged ? 'unseen' : m.category,
      title: m.title,
    };
  });
}

export function dayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start.getTime(), end.getTime()];
}

const PHRASES = [
  [/making breakfast|cook/, 'made breakfast'],
  [/breakfast/, 'had breakfast'],
  [/lunch/, 'had lunch'],
  [/dinner|supper/, 'had dinner'],
  [/tea|coffee/, 'had a cup of tea'],
  [/walk|outdoor/, 'went for a walk'],
  [/tele|tv/, 'watched television'],
  [/radio/, 'listened to the radio'],
  [/read|book|newspaper/, 'read for a while'],
  [/sitting|rest|relax/, 'rested in the living room'],
];

/**
 * One plain paragraph for the whole day, built only from what was logged — no model call,
 * so it can't invent anything. Short or one-off sightings are skipped as noise.
 */
export function daySummary(name, moments, incidents) {
  const parts = [];
  const seen = new Set();
  for (const m of moments) {
    if (m.kind !== 'activity' || m.category === 'unseen') continue;
    const long = m.end - m.start >= 10 * 60000 || m.count >= 2;
    if (!long) continue;
    const a = m.title.toLowerCase();
    const hit = PHRASES.find(([re]) => re.test(a));
    const phrase = hit ? hit[1] : a;
    if (seen.has(phrase)) continue;
    seen.add(phrase);
    const prev = parts[parts.length - 1];
    if (prev && prev.text === 'made breakfast' && phrase === 'had breakfast') {
      prev.text = 'made and ate breakfast';
      continue;
    }
    parts.push({ at: m.start, text: phrase });
  }
  for (const inc of incidents) {
    const mins = Math.round(((inc.resolved?.at ?? inc.end) - inc.start) / 60000);
    parts.push({
      at: inc.start,
      text: inc.resolved
        ? `was outside the safe zones for ${mins} minutes before coming back`
        : 'left the safe zones and has not come back yet',
      alert: true,
    });
  }
  parts.sort((a, b) => a.at - b.at);
  if (!parts.length) return null;
  const texts = parts.map((p) => p.text);
  const list =
    texts.length === 1
      ? texts[0]
      : `${texts.slice(0, -1).join(', ')}, then ${texts[texts.length - 1]}`;
  return `So far today, ${name} ${list}.`;
}

export function dayPart(t) {
  const h = new Date(t).getHours();
  if (h < 5) return 'Night';
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  if (h < 21) return 'Evening';
  return 'Night';
}

/**
 * Minutes spent inside each zone, from consecutive location pings. A gap longer than
 * `maxGapMin` isn't counted — no pings means we don't actually know where they were.
 */
export function minutesInZones(entries, zones, maxGapMin = 45) {
  const pings = entries
    .filter((e) => e.entryType === 'geofence' && typeof e.payload?.lat === 'number')
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const totals = {};
  for (let i = 0; i < pings.length - 1; i++) {
    const place = placeOf(pings[i], zones);
    if (!place.inside) continue;
    const gap = (new Date(pings[i + 1].timestamp) - new Date(pings[i].timestamp)) / 60000;
    if (gap > maxGapMin) continue;
    totals[place.zone.id] = (totals[place.zone.id] || 0) + gap;
  }
  return totals;
}
