import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchPatientStatus } from '../api/status.js';
import { useNow } from '../lib/hooks.js';
import { Avatar, Icon, Logo, cx } from '../ui';

const NAV = [
  { to: '/today', label: 'Today', icon: 'home' },
  { to: '/log', label: 'Log', icon: 'timeline' },
  { to: '/places', label: 'Places', icon: 'map' },
  { to: '/people', label: 'People', icon: 'people' },
  { to: '/memory', label: 'Memory', icon: 'brain' },
];

function usePatientStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['status', user?.patient_id],
    queryFn: () => fetchPatientStatus(user.patient_id),
    enabled: Boolean(user?.patient_id),
    refetchInterval: 30000,
  });
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-black/[0.04]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user?.name} size={30} />
        <Icon name="chevronDown" size={14} className="text-ink-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-[1000] w-60 overflow-hidden rounded-xl border border-line bg-surface text-ink shadow-pop">
          <div className="border-b border-line px-4 py-3">
            <p className="font-semibold">{user?.name}</p>
            <p className="text-sm text-ink-3">Family caregiver</p>
          </div>
          <NavLink
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-base hover:bg-subtle"
          >
            <Icon name="settings" size={16} className="text-ink-3" /> Settings & devices
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-base hover:bg-subtle"
          >
            <Icon name="logout" size={16} className="text-ink-3" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function ago(min) {
  if (min == null) return 'no updates yet';
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
}

const TONE = {
  ok: { ring: '#4D7C5A', text: 'text-ok' },
  watch: { ring: '#AD772A', text: 'text-watch' },
  act: { ring: '#B4503C', text: 'text-act' },
  neutral: { ring: '#D4CCBF', text: 'text-ink-3' },
};

// Who you're watching, plus the one line you'd want before opening anything: where, and how fresh.
function PatientChip() {
  const { user } = useAuth();
  const { data } = usePatientStatus();
  const name = user?.patient_name || data?.patient?.name || 'Patient';
  const outside = data?.location?.inside_safe_zone === false;
  const tone = !data ? 'neutral' : outside ? 'act' : data.needs_attention_count > 0 || data.is_stale ? 'watch' : 'ok';
  const where = !data
    ? 'Connecting…'
    : outside
      ? 'Outside safe places'
      : data.location?.zone_name
        ? `At ${data.location.zone_name}`
        : data.is_stale
          ? 'No recent signal'
          : 'All quiet';
  const t = TONE[tone];
  return (
    <Link
      to="/today"
      className="flex min-w-0 items-center gap-3 rounded-full py-1 pl-1 pr-2 transition hover:bg-black/[0.04] sm:pr-4"
    >
      <span className="relative grid place-items-center">
        <span className="rounded-full p-[2px]" style={{ boxShadow: `0 0 0 2px ${t.ring}` }}>
          <Avatar name={name} size={28} />
        </span>
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[13px] font-semibold text-ink">{name}</span>
        <span className={cx('block truncate text-[11px] font-medium', t.text)}>
          {where}
          {data && <span className="text-ink-4"> · {ago(data.minutes_since_update)}</span>}
        </span>
      </span>
    </Link>
  );
}

// One track with a white pill that glides to the active page.
function Nav({ dock = false }) {
  const { pathname } = useLocation();
  const refs = useRef({});
  const [pill, setPill] = useState(null);
  useLayoutEffect(() => {
    const measure = () => {
      const hit = NAV.find((n) => pathname.startsWith(n.to));
      const el = hit && refs.current[hit.to];
      setPill(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    window.addEventListener('resize', measure);
    // Public Sans may land after first paint and change the tab widths.
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, [pathname]);
  return (
    <nav className={cx('relative flex items-center rounded-full p-1', dock ? 'w-full justify-between' : 'bg-black/[0.035]')}>
      {pill && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1 rounded-full bg-ink shadow-[0_6px_16px_-8px_rgba(42,38,34,0.6)] transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{ left: pill.left, width: pill.width }}
        />
      )}
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          ref={(el) => (refs.current[item.to] = el)}
          className={({ isActive }) =>
            cx(
              'relative z-10 flex items-center rounded-full font-semibold transition-colors duration-300',
              dock ? 'h-12 flex-1 flex-col justify-center gap-0.5 text-[10.5px]' : 'h-9 gap-2 px-4 text-[13px]',
              isActive ? 'text-surface' : 'text-ink-3 hover:text-ink'
            )
          }
        >
          <Icon name={item.icon} size={dock ? 17 : 15} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

// The header's hairline, the clock glyph and the page wash all follow the time of day.
const GLOW = { morning: '#F0A36A', afternoon: '#6FAFD0', evening: '#D98BB0', night: '#8C94D6' };
const PART_LABEL = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' };

function partOfDay(t = Date.now()) {
  const h = new Date(t).getHours();
  return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 21 ? 'evening' : 'night';
}

function Clock({ now, part }) {
  return (
    <div className="hidden text-right leading-tight xl:block">
      <p className="text-[13px] font-semibold tabular-nums text-ink">
        {new Date(now).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
      </p>
      <p className="flex items-center justify-end gap-1.5 text-[11px] font-medium text-ink-3">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: GLOW[part], boxShadow: `0 0 8px ${GLOW[part]}` }} />
        {PART_LABEL[part]} · {new Date(now).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
      </p>
    </div>
  );
}

function Bell() {
  const { data } = usePatientStatus();
  const n = data?.needs_attention_count || 0;
  return (
    <Link
      to="/today"
      aria-label={n ? `${n} readings need a look` : 'Nothing needs a look'}
      title={n ? `${n} readings need a look` : 'Nothing needs a look'}
      className="relative grid h-9 w-9 place-items-center rounded-full text-ink-3 transition hover:bg-black/[0.04] hover:text-ink"
    >
      <Icon name="bell" size={16} />
      {n > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-act ring-2 ring-surface" />}
    </Link>
  );
}

// The page is painted, not grey: a soft field of colour blobs that follows the time of day.
// Cards are frosted glass over it, so the colour reads through everything instead of being boxed out.
const AMBIENT = {
  morning: ['#F3BE90', '#F1D7A8', '#C3D6B8', '#E8B8AE'],
  afternoon: ['#ADCBE0', '#C2DBC8', '#EAD9B8', '#C8CCE8'],
  evening: ['#E8AFBB', '#C8B6E0', '#F0C6A2', '#D4A8C4'],
  night: ['#B8B5DE', '#D8B8D2', '#ADBAD8', '#EBC9B6'],
};

function Ambient({ part }) {
  const [a, b, c, d] = AMBIENT[part];
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 transition-[background] duration-1000"
      style={{
        background: `radial-gradient(70vw 70vh at 5% 0%, ${a}, transparent 72%),
                     radial-gradient(65vw 75vh at 100% 15%, ${b}, transparent 72%),
                     radial-gradient(70vw 70vh at 80% 105%, ${c}, transparent 72%),
                     radial-gradient(65vw 70vh at 0% 100%, ${d}, transparent 72%),
                     #ECE7DF`,
      }}
    />
  );
}

export default function Layout({ children }) {
  const now = useNow();
  const part = partOfDay(now);

  return (
    <div className="relative flex min-h-full flex-col">
      <Ambient part={part} />
      <header className="sticky top-0 z-[900] mx-auto w-full max-w-[1760px] px-3 pt-3 sm:px-6 lg:px-10">
        <div
          className="relative flex h-[60px] items-center gap-3 rounded-[20px] border border-white/60 bg-white/45 pl-3 pr-2 text-ink shadow-card backdrop-blur-2xl sm:gap-5 sm:pl-5 sm:pr-2.5"
        >
          {/* time-of-day hairline along the bottom edge */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-16 -bottom-px h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${GLOW[part]}, transparent)` }}
          />
          <Link to="/today" className="flex shrink-0 items-center gap-2.5">
            <Logo size={26} />
            <span className="hidden text-lg font-bold tracking-[-0.01em] sm:inline lg:hidden xl:inline">Assist</span>
          </Link>
          <PatientChip />
          <div className="mx-auto hidden lg:block">
            <Nav />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3 lg:ml-0">
            <Clock now={now} part={part} />
            <span className="hidden h-7 w-px bg-black/[0.07] xl:block" />
            <Bell />
            <AccountMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1760px] flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-8 lg:pt-6">
        {children}
      </main>
      {/* Below lg the nav moves to a floating dock at the thumb, like a phone app. */}
      <div className="fixed inset-x-3 bottom-3 z-[900] lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto max-w-md rounded-[22px] border border-white/60 bg-white/55 p-1 shadow-lift backdrop-blur-2xl">
          <Nav dock />
        </div>
      </div>
    </div>
  );
}
