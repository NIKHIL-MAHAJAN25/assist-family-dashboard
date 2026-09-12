# Assist — Family Dashboard

A React web dashboard for family caregivers in an AI-assisted safety and memory-support system
for a person with mild-to-moderate memory impairment. Only the `family_caregiver` role gets in;
a `patient`-role login is deliberately routed to a "use the companion app" screen instead of the
dashboard (`src/components/ProtectedRoute.jsx`).

## Stack

- Vite + React 18, plain JavaScript — no TypeScript, no `.tsx`.
- `react-router-dom` v6 for routing, `@tanstack/react-query` v5 for all server state.
- Tailwind CSS v3 (via PostCSS + autoprefixer) for all styling.
- `axios` for HTTP, `react-leaflet` + `leaflet` (OpenStreetMap tiles) for maps, `face-api.js` for
  in-browser face matching.

## Commands

- `npm run dev` — Vite dev server on port 5173.
- `npm run build` — production build.
- `npm run preview` — preview the production build.
- `npm run lint` — ESLint over the whole repo.

The backend API (Node/Express) is a separate process and is not started by anything here — run it
yourself before `npm run dev`. Env vars (see `.env.example`):
- `VITE_API_BASE_URL` — backend base URL, default `http://localhost:3000`.
- `VITE_CLOUDINARY_CLOUD_NAME` — Cloudinary cloud name used to build read-only image URLs for
  log-entry frames (`buildCloudinaryUrl` in `src/api/client.js`).

## The design system ("Assist Sage")

All tokens live in `tailwind.config.js` and nowhere else — never hardcode a hex value in a
component.

**Colour tokens**
- Grounds: `paper` (page background), `surface` (raised card), `surface-sunken` (inset panel),
  `surface-fill` (input/chip/bottom-bar fill).
- Lines: `line` (hairline), `line-sage` (emphasised sage hairline).
- Brand ramp: `sage-50` … `sage-900`, plus bare `sage` (the `DEFAULT`, `#698B6A`).
- Text: `ink` (primary), `ink-soft` (secondary/headings), `ink-faint` (meta/timestamps).
- Status trios, each with `-fg` / `-bg` / `-line`: `ok`, `attend`, `alert`, `info`.

**Hard rules**
- No stock Tailwind palette classes anywhere — no `slate-*`, `gray-*`, `sky-*`, `blue-*`,
  `red-*`, `amber-*`, `emerald-*`, `green-*`. Tokens only.
- White text goes on `sage-700` (5.8:1, AA-safe), never on bare `sage` (3.8:1, fails AA). Bare
  `sage` is for strokes, icons, rails, and display type, not text-on-fill.

**Fonts** — both loaded from Google Fonts in `index.html`:
- `font-display` → Fraunces. Display sizes only (page titles, big headlines). Applying it also
  triggers the `.font-display` base rule in `src/index.css` that sets the SOFT variable-font axis.
- `font-sans` → Atkinson Hyperlegible. The default for everything else; set on `body`.

**Primitives exported from `src/ui/index.js`** (signatures read from the actual source files):
- `Icon({ name, size = 20, className, strokeWidth = 1.7, ...rest })` — hand-rolled stroke-icon
  set; valid `name`s are `ICON_NAMES` (also exported).
- `Button({ variant = 'primary', size = 'md', icon, iconAfter, loading = false, className,
  children, disabled, type = 'button', ...rest })` — `variant`: `primary | secondary | soft |
  ghost | danger`. `size`: `sm | md | lg`.
- `IconButton({ icon, label, variant = 'ghost', size = 'md', className, ...rest })` — square,
  icon-only; `label` becomes `aria-label`/`title`.
- `Card({ accent, interactive = false, emphasis = false, className, bodyClassName = 'p-5',
  children, ...rest })` — `accent`: `sage | ok | attend | alert | info | quiet` (renders a 4px
  left rail); `interactive` adds hover lift; `emphasis` swaps the border to `line-sage`.
- `Panel({ className, children, ...rest })` — soft inset panel (`surface-sunken`).
- `SectionTitle({ children, hint, className })` — heading inside a Card/Panel.
- `Field({ label, hint, error, className, mono = false, ...rest })` — text input; `...rest`
  passed straight to the `<input>`.
- `SelectField({ label, hint, error, className, children, ...rest })` — `<select>` wrapper;
  `children` are `<option>`s.
- `FileField({ label, hint, error, className, fileName, ...rest })` — styled file picker,
  `fileName` shows the currently chosen file.
- `CheckPill({ checked, onChange, disabled, icon, children })` — pill-shaped checkbox toggle.
- `Chip({ tone = 'neutral', dot = false, className, children, ...rest })` — `tone`: `neutral |
  sage | ok | attend | alert | info`.
- `FilterChip({ active = false, className, children, ...rest })` — single-select toggle chip.
- `PageHeader({ eyebrow, title, description, actions, className })`.
- `Skeleton({ className })`, `LoadingBanner({ label = 'Loading…', rows = 3 })`,
  `ErrorBanner({ error, label = 'Something went wrong' })` (reads
  `error?.response?.data?.message || error?.message`), `EmptyState({ label, hint, icon =
  'inbox', action })`.
- `Brandmark({ size = 36, className })`, `BrandLockup({ subtitle = 'Family dashboard', compact =
  false })`.

**Raw CSS component classes, in `src/index.css`** — use these only for the bare HTML controls
that the `Field`/`SelectField` primitives already wrap internally; reach for the React primitives
first, and use these classes directly only when building a control the primitives don't cover:
- `.av-input` — pill text input (`rounded-field`, `surface-fill` background, no visible border
  until focus).
- `.av-select` — `.av-input` plus a custom dropdown arrow and no native chrome.
- `.av-label` — small bold uppercase field label.
- `.av-hint` — small muted helper/hint text under a field.
- `.av-card` — `rounded-card` bordered surface (what `Card` renders as JSX).
- `.av-divider` — 1px `line`-coloured horizontal rule.

**Reference files** — `src/pages/Login.jsx` is the reference screen for the whole design system;
`src/components/Layout.jsx` is the reference shell (desktop floating sidebar / mobile bottom bar).

## Conventions for a new screen

- Open with `<PageHeader eyebrow={...} title={...} description={...} actions={...} />`.
- Represent the three data states with `LoadingBanner`, `ErrorBanner`, and `EmptyState` from
  `src/ui` — do not hand-roll spinners or "no data" text.
- Never use `window.confirm` or `window.alert`. Hold the pending id/target in component state
  (e.g. `const [confirmDeleteId, setConfirmDeleteId] = useState(null)`) and swap the row's
  action buttons for an inline confirm/cancel pair when it matches. See
  `src/pages/GeofenceZones.jsx` and `src/pages/Faces.jsx` for the real pattern.
- Format every date/time through `src/utils/datetime.js` (`formatTime`, `formatDateTime`,
  `formatDayLabel`) — never call `toLocaleTimeString` directly. Reason: `hour: 'numeric'` without
  an explicit `hour12` can render something like "16:43 AM" on some locales; this file always
  passes `hour12` explicitly.

## Architecture notes

- No Redux, no repository/service layer. Screens call the API modules in `src/api/` directly
  through react-query hooks (`useQuery`/`useMutation`).
- Auth: the JWT + user object live in `localStorage` under the key `family_dashboard_auth`
  (`src/context/AuthContext.jsx`). `src/api/client.js` installs an axios request interceptor that
  attaches `Authorization: Bearer <token>` to every request, and a response interceptor that
  clears that storage key on any `401`, which `ProtectedRoute` then turns into a redirect to
  `/login` on next render.
