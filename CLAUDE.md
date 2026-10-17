# Assist — Family Dashboard

React dashboard for family caregivers. Only `family_caregiver` logins get in; a `patient` login
sees a "use the phone app" screen (`src/components/ProtectedRoute.jsx`).

## Stack & commands

Vite + React 18 (plain JS), react-router v6, @tanstack/react-query v5, Tailwind v3, axios,
react-leaflet (OpenStreetMap tiles, desaturated in `index.css`), face-api.js (in-browser).

- `npm run dev` — port 5173. The backend (`D:\backend-server`, port 3000) must be running.
- `npm run build` — production build; use it as the compile check.
- Env (`.env`): `VITE_API_BASE_URL`, `VITE_CLOUDINARY_CLOUD_NAME`.
- Demo login after `node prisma/seed.js` in the backend: `caregiver@example.com` / `caregiver123`.

## Layout

- `src/pages/` — `Login`, `Today`, `Log`, `Places`, `People`, `Memory`, `Settings`. Old routes
  (`/timeline`, `/alerts`, `/geofences`, …) redirect in `App.jsx`.
- `src/lib/story.js` — all interpretation of raw `log_entries`: `buildMoments` (merges repeated
  frames, collapses location pings to place changes), `buildIncidents` (groups flagged entries
  ≤45 min apart, finds the "back safe" ping), `ribbonSegments`, `daySummary`, `categorize`.
  Screens never interpret raw entries themselves — add logic here.
- `src/lib/hooks.js` — react-query hooks (`useEntries`, `useZones`, `useStatus`,
  `useQuizHistory`, `useNow`). Query keys: `entries`, `zones`, `status`, `quiz`, `faces`.
- `src/components/` — `Layout` (black floating top bar: patient status chip, rose sliding nav
  pill, clock, alerts bell; black bottom dock below lg), `Tour` (coachmarks: welcome card, then a
  spotlight over `data-tour="<target>"` elements; `?` button replays; seen-state in localStorage
  `tour:<id>`), `DayRibbon`, `ZoneMap`, `MomentList`, `IncidentCard`, `DayPicker`.
- `src/ui/index.jsx` — primitives: `Button` (`primary|secondary|ghost|danger`, `sm|md|lg`),
  `IconButton`, `Badge` (`ok|watch|act|neutral`), `StatusDot`, `Panel` (`title`, `action`,
  `flush`), `PageTitle`, `Field`, `Segmented`, `Loading`, `ErrorNote`, `Empty`, `Logo`
  (`inverse` on dark), `Avatar`, `cx`. `Icon` names live in `src/ui/Icon.jsx`.

## Design rules ("Atria")

- Pale blue page gradient; soft near-white tiles (`bg-paper` #F5F4EF, `rounded-[20px]`, no border) floating on
  it; off-white top bar with a sky-blue sliding pill. Black only for buttons (pills, round arrows).
- Type: `font-serif` (DM Serif Display) for titles and big numbers; Public Sans for the rest.
- One blue→lime gradient (`GRADIENT` in Today.jsx) for the day chart and the selected moment.
  Everything else is off-white. Status lives only in the round chips: lime = fine, sand = worth a
  look, coral = act now. No coloured blocks or decorative shapes.
- Other pages sit on one off-white sheet (Layout); their inner `.glass`/`.panel` cards are white
  with a hairline border.
- Say each alert once: open incidents sit under the Today greeting (`IncidentCard embedded`).
- Tokens only, from `tailwind.config.js`: `ground`, `surface`, `subtle`/`paper`, `line`, `ink`/`ink-2..4`,
  `accent` (= ink), the blocks above, and the status trio `ok` / `watch` / `act` (each with `-soft`, `-line`).
- Badges, dots and alerts still use status colours only (green = fine, amber = worth a look,
  red = act now). Activity categories in the ribbon use `CATEGORIES` colours from `story.js`.
- Tabular numerals on `body`. Small uppercase labels only under
  a stat number (`Stats` on Today) and in `.section-title`.
- Inline confirm for destructive actions (no `window.confirm`). Times go through
  `src/utils/datetime.js`.
- Don't gender the patient in copy — use their name.
