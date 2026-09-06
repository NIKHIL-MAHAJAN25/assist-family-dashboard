# Family Dashboard

Family-caregiver-facing React dashboard for the AI-assisted safety/cognitive-engagement system. This
app is for `family_caregiver` accounts only — the patient interacts through a separate companion phone
app, not this dashboard.

## Stack

- Vite + React 18, plain JavaScript (no TypeScript)
- `react-router-dom` for routing
- `@tanstack/react-query` for all data fetching/caching/loading/error state
- Tailwind CSS for styling
- `react-leaflet` + Leaflet with OpenStreetMap tiles for the geofence zone map editor
- `face-api.js` for client-side face descriptor computation during face enrollment

## Setup

```bash
npm install
cp .env.example .env   # then edit values if needed
npm run dev
```

Default `.env` values point at a backend running on `http://localhost:3000`. Demo login (dev DB):
`caregiver@example.com` / `caregiver123`.

## Environment variables

- `VITE_API_BASE_URL` — base URL of the backend API. Defaults to `http://localhost:3000`.
- `VITE_CLOUDINARY_CLOUD_NAME` — Cloudinary cloud name used to build read-only image URLs
  (`https://res.cloudinary.com/<cloud_name>/image/upload/<imagePublicId>`) for `frame` log entries.
  Not configured in this environment yet — until it's set, frame images will fail to load and the UI
  falls back to a "No image" / "Image unavailable" placeholder instead of crashing.

## Notable implementation choices

- **Auth storage**: the JWT is held in a React context (`src/context/AuthContext.jsx`) and mirrored to
  `localStorage` so a page refresh doesn't log the user out. This is a deliberate simplicity trade-off
  for a prototype (accepted XSS exposure vs. httpOnly cookies), per the project brief — no extra
  hardening was added on top of it.
- **Patient-role login**: if `/api/auth/login` succeeds but returns `role: "patient"`, the app renders a
  full-screen "please use the companion app on your phone" message instead of any dashboard content
  (`src/components/ProtectedRoute.jsx`). Route guarding also redirects to `/login` whenever there's no
  stored token.
- **face-api.js models**: loaded lazily from a CDN (`cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js`)
  rather than bundled under `public/`, since the model weight files are tens of megabytes and would
  bloat the repo. See `src/utils/faceApi.js`. Face descriptors (128-length arrays) are computed
  entirely client-side from the uploaded photo; only the resulting numeric array is POSTed to
  `/api/enrolled-faces` — the photo itself never leaves the browser.
- **Geofence zone map**: `src/components/GeofenceMap.jsx` implements click-to-place for the zone center
  (draggable marker) and a second draggable "handle" marker on the circle's edge; dragging the handle
  recomputes the radius from the great-circle distance to the center (via Leaflet's
  `LatLng.distanceTo`). Default marker icons are replaced with small inline `divIcon`s to avoid Vite's
  known issue with Leaflet's default marker image asset paths.
- **Payload rendering**: the API contract fully specifies the `payload` shape only for `entryType:
  "frame"` (`activity`, `objects_of_note`, `person_state`, `confidence`). `geofence`, `heartrate`, and
  `quiz` entries render generically (a key/value grid of the entry's scalar fields) since their payload
  shapes aren't pinned down in the contract — this avoids hard-coding field names that might not match
  what the backend actually sends for those types.
- **Device registration**: the `patient_id` field defaults to the logged-in caregiver's associated
  patient but stays editable, since the contract's request body takes an explicit `patient_id`. The
  returned `api_key` is shown once with a copy button and an explicit "won't be shown again" warning,
  per the contract note that only a hash is stored server-side.

## What's stubbed / simplified

- No automated test suite was added (out of scope per the brief; this is a prototype-scale project).
- The Cloudinary cloud name is a placeholder (`your-cloud-name-here`) since no real value was available
  in this environment — image loading was verified to fail gracefully rather than against a real
  Cloudinary asset.
- A full live smoke test against the backend could not be completed in this environment if its local
  Postgres is unreachable; see the verification notes in the delivery report for exactly what was and
  wasn't exercised.
