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
- `src/components/` — `Layout` (floating ivory glass header: patient status chip, sliding nav pill, clock, alerts bell; time-of-day wash + hairline), `DayRibbon`, `ZoneMap`, `MomentList`,
  `IncidentCard`, `DayPicker` (glass date pill over a hidden native date input).
- `src/ui/index.jsx` — primitives: `Button` (`primary|secondary|ghost|danger`, `sm|md|lg`),
  `IconButton`, `Badge` (`ok|watch|act|neutral`), `StatusDot`, `Panel` (`title`, `action`,
  `flush`), `PageTitle`, `Field`, `Segmented`, `Loading`, `ErrorNote`, `Empty`, `Logo`
  (`inverse` on dark), `Avatar`, `cx`. `Icon` names live in `src/ui/Icon.jsx`.

## Design rules ("Linen")

- Every neutral shares one warm tint (linen ground, ivory surfaces, warm charcoal ink) — no pure
  white, no cold grey, no black bars. Status colours are earthy (sage / ochre / terracotta).
- Say each alert once: open incidents live inside the Today hero (`IncidentCard embedded`).
- Tokens only, from `tailwind.config.js`: `ground`, `surface`, `subtle`, `line`, `ink`/`ink-2..4`,
  `accent`, and the status trio `ok` / `watch` / `act` (each with `-soft`, `-line`).
- Colour means status. Green = fine, amber = worth a look, red = act now. Activity categories
  in the ribbon use `CATEGORIES` colours from `story.js`, never status colours.
- One font (Public Sans), tabular numerals on `body`. No serif, no pill-shaped everything, no
  uppercase eyebrow labels except `.section-title`.
- Inline confirm for destructive actions (no `window.confirm`). Times go through
  `src/utils/datetime.js`.
- Don't gender the patient in copy — use their name.
