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

## Design rules ("Colour-block")

- Flat cream page (`ground`), paper cards (`.glass` / `.panel` = `bg-paper`, no border, no blur),
  black for chrome and actions (top bar, dock, primary pills). No gradients behind content.
- Colour blocks (`butter`, `rose`, `sage`, `sky`, `coral`, each with `-deep` for its one big soft
  shape) mark *kinds* of things on Today (day, memory, places, moments). The status block is the
  exception: sage = fine, apricot = worth a look, coral = act now.
- Say each alert once: open incidents sit under the Today greeting (`IncidentCard embedded`).
- Tokens only, from `tailwind.config.js`: `ground`, `surface`, `subtle`/`paper`, `line`, `ink`/`ink-2..4`,
  `accent` (= ink), the blocks above, and the status trio `ok` / `watch` / `act` (each with `-soft`, `-line`).
- Badges, dots and alerts still use status colours only (green = fine, amber = worth a look,
  red = act now). Activity categories in the ribbon use `CATEGORIES` colours from `story.js`.
- One font (Public Sans), tabular numerals on `body`. No serif. Small uppercase labels only under
  a stat number (`Stats` on Today) and in `.section-title`.
- Inline confirm for destructive actions (no `window.confirm`). Times go through
  `src/utils/datetime.js`.
- Don't gender the patient in copy — use their name.
