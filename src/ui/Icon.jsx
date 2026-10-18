import React from 'react';

// A small hand-rolled stroke-icon set rather than an icon dependency: it keeps
// the stroke weight (1.7) and corner rounding consistent with the rest of the
// Assist Sage shape language, and the whole set costs less than the tree-shaken
// slice of a library would.

const PATHS = {
  mic: (
    <>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" />
    </>
  ),
  send: <path d="M12 19V5.5M6.5 11 12 5.5l5.5 5.5" />,
  play: <path d="M8 5.8v12.4a.8.8 0 0 0 1.2.7l10-6.2a.8.8 0 0 0 0-1.4l-10-6.2a.8.8 0 0 0-1.2.7Z" />,
  pause: <path d="M8.5 5.5v13M15.5 5.5v13" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  printer: (
    <>
      <path d="M7 9V4.5h10V9M7 16.5H5a1.5 1.5 0 0 1-1.5-1.5v-4.5A1.5 1.5 0 0 1 5 9h14a1.5 1.5 0 0 1 1.5 1.5V15a1.5 1.5 0 0 1-1.5 1.5h-2" />
      <rect x="7" y="13.5" width="10" height="6" rx="1" />
    </>
  ),
  report: (
    <>
      <path d="M7 3.5h7l4 4v13H7a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M13.5 3.5V8h4.5M9 13h6M9 16.5h4" />
    </>
  ),
  speaker: (
    <>
      <path d="M4.5 9.5h3l4.5-3.8v12.6L7.5 14.5h-3z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </>
  ),
  map: (
    <>
      <path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16.5 14.3c2.2.2 3.6 1.8 4 4.2" />
    </>
  ),
  brain: (
    <>
      <path d="M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-1.5 5.6A3 3 0 0 0 8 18a2.5 2.5 0 0 0 4 1V5.5a2.5 2.5 0 0 0-3-1Z" />
      <path d="M15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 1.5 5.6A3 3 0 0 1 16 18a2.5 2.5 0 0 1-4 1" />
    </>
  ),
  watch: (
    <>
      <rect x="6.5" y="6.5" width="11" height="11" rx="3" />
      <path d="M9 6.5 9.5 3h5l.5 3.5M9 17.5l.5 3.5h5l.5-3.5M12 10v2.2l1.4 1" />
    </>
  ),
  walk: (
    <>
      <circle cx="13" cy="4.5" r="1.8" />
      <path d="m10 21 2.2-6 2.3 2v4M8 12l2.5-4h3l2 3.5 2.5 1M12.5 8 11 14" />
    </>
  ),
  heartPulse: (
    <>
      <path d="M20.5 9.5c0 5-8.5 10-8.5 10S3.5 14.5 3.5 9.5A4.5 4.5 0 0 1 12 7.2a4.5 4.5 0 0 1 8.5 2.3Z" />
      <path d="M3.8 12h4.2l1.5-2.5 2.5 5 1.5-2.5h6.7" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />,
  timeline: (
    <>
      <circle cx="6" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <path d="M6 8v8" />
      <path d="M11 6h9M11 18h9M11 12h6" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 1 0-12 0c0 4.2-1.4 5.6-1.9 6.1a.6.6 0 0 0 .4 1h15a.6.6 0 0 0 .4-1c-.5-.5-1.9-1.9-1.9-6.1Z" />
      <path d="M10.3 20a2 2 0 0 0 3.4 0" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.2 5 6v5.6c0 4.2 2.9 7.6 7 9.2 4.1-1.6 7-5 7-9.2V6l-7-2.8Z" />
      <path d="m9.2 12 2 2 3.6-3.8" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6.5-5.4 6.5-10.2a6.5 6.5 0 0 0-13 0C5.5 15.6 12 21 12 21Z" />
      <circle cx="12" cy="10.6" r="2.4" />
    </>
  ),
  faces: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 10.5h.01M15 10.5h.01" strokeWidth="2.2" />
      <path d="M8.8 14.6a4.2 4.2 0 0 0 6.4 0" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3.5 13.7 9 19 10.8 13.7 12.6 12 18.1 10.3 12.6 5 10.8 10.3 9 12 3.5Z" />
      <path d="M18.4 16.4 19 18.2l1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6.6-1.8Z" />
    </>
  ),
  device: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <circle cx="12" cy="12" r="3" />
      <path d="M17.5 9.2h.01" strokeWidth="2.2" />
    </>
  ),
  logout: (
    <>
      <path d="M14.5 8.5V6.8A2.3 2.3 0 0 0 12.2 4.5H6.8A2.3 2.3 0 0 0 4.5 6.8v10.4A2.3 2.3 0 0 0 6.8 19.5h5.4a2.3 2.3 0 0 0 2.3-2.3v-1.7" />
      <path d="M10 12h9.5M17 9l3 3-3 3" />
    </>
  ),
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  trash: (
    <>
      <path d="M4.8 7h14.4M9.5 7V5.6A1.1 1.1 0 0 1 10.6 4.5h2.8a1.1 1.1 0 0 1 1.1 1.1V7" />
      <path d="M6.6 7l.8 11.1A1.9 1.9 0 0 0 9.3 20h5.4a1.9 1.9 0 0 0 1.9-1.9L17.4 7" />
    </>
  ),
  pencil: (
    <>
      <path d="M16.4 4.6a2 2 0 0 1 2.8 2.8L8.5 18.1l-3.8 1 1-3.8L16.4 4.6Z" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2.6" />
      <path d="M15 6.2A2.2 2.2 0 0 0 12.8 4H6.2A2.2 2.2 0 0 0 4 6.2v6.6A2.2 2.2 0 0 0 6.2 15" />
    </>
  ),
  chevronDown: <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  chevronRight: <path d="m9.5 6.5 5.5 5.5-5.5 5.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.8" y="5.5" width="16.4" height="14.7" rx="3" />
      <path d="M3.8 10h16.4M8.5 3.5v3.6M15.5 3.5v3.6" />
    </>
  ),
  camera: (
    <>
      <path d="M3.5 9.2a2.4 2.4 0 0 1 2.4-2.4h1.4l1.1-2h7.2l1.1 2h1.4a2.4 2.4 0 0 1 2.4 2.4v7.4a2.4 2.4 0 0 1-2.4 2.4H5.9a2.4 2.4 0 0 1-2.4-2.4V9.2Z" />
      <circle cx="12" cy="12.6" r="3.3" />
    </>
  ),
  image: (
    <>
      <rect x="3.8" y="5" width="16.4" height="14" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4.5 17 4.3-4.3a1.8 1.8 0 0 1 2.5 0l4.2 4.2m-1.6-1.6 1.4-1.4a1.8 1.8 0 0 1 2.5 0l1.7 1.7" />
    </>
  ),
  heart: (
    <>
      <path d="M12 19.5s-7-4.2-7-9a3.9 3.9 0 0 1 7-2.4 3.9 3.9 0 0 1 7 2.4c0 4.8-7 9-7 9Z" />
    </>
  ),
  bookmark: <path d="M6.5 4.5h11v15l-5.5-3.8-5.5 3.8v-15Z" />,
  filter: <path d="M4.5 6.5h15l-5.8 6.6v5.2l-3.4 1.7v-6.9L4.5 6.5Z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.2v5M12 7.9h.01" strokeWidth="2.2" />
    </>
  ),
  warning: (
    <>
      <path d="M10.7 4.3 3.4 17a1.5 1.5 0 0 0 1.3 2.3h14.6A1.5 1.5 0 0 0 20.6 17L13.3 4.3a1.5 1.5 0 0 0-2.6 0Z" />
      <path d="M12 9.6v4M12 16.6h.01" strokeWidth="2.2" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.8 13.5 6.4 6a2 2 0 0 1 1.9-1.3h7.4A2 2 0 0 1 17.6 6l2.6 7.5" />
      <path d="M3.8 13.5h4.1l1.1 2.3h6l1.1-2.3h4.1v3.9a2 2 0 0 1-2 2H5.8a2 2 0 0 1-2-2v-3.9Z" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5" />
      <path d="M19.8 4.5v4.2h-4.2" />
    </>
  ),
  menu: <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2.4M12 18.1v2.4M20.5 12h-2.4M5.9 12H3.5M17.7 6.3l-1.7 1.7M8 16l-1.7 1.7M17.7 17.7 16 16M8 8 6.3 6.3" />
    </>
  ),
};

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.7, ...rest }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {path}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(PATHS);
