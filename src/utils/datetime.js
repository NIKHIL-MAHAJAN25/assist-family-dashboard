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
