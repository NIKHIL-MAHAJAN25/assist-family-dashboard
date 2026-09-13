// Shared time/date formatters for the log-entry, alert and quiz screens.
// hour12 is always passed explicitly — on some host locales `hour: 'numeric'`
// alone resolves to a 24-hour clock that still appends a day period (e.g.
// "16:43 AM"), which is exactly the bug this file exists to avoid.

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTime(value) {
  const date = toDate(value);
  if (!date) return 'Unknown time';
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return 'Unknown time';
  const datePart = date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timePart = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}

export function formatDayLabel(value) {
  const date = toDate(value);
  if (!date) return 'Unknown date';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Minutes elapsed between `value` and `now`, or null if `value` doesn't
 * parse. Negative (future) values clamp to 0 rather than going negative. */
export function minutesSince(value, now = Date.now()) {
  const date = toDate(value);
  if (!date) return null;
  const diffMs = now - date.getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

/** "just now" / "11 minutes ago" / "3 hours ago" / "2 days ago". Used
 * wherever the UI needs to say how long ago something happened rather than
 * the clock time itself. */
export function timeAgo(value, now = Date.now()) {
  const minutes = minutesSince(value, now);
  if (minutes === null) return 'unknown time';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** "briefly" / "about 12 minutes" / "about 2 hours" — for describing the
 * span of an episode, not a point in time. */
export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return 'briefly';
  const minutes = Math.round(ms / 60000);
  if (minutes < 2) return 'briefly';
  if (minutes < 60) return `about ${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  return `about ${hours} hour${hours === 1 ? '' : 's'}`;
}
