import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import NotificationCenter from './Notifications.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchPatientStatus } from '../api/status.js';
import { useNow } from '../lib/hooks.js';
import { Icon, cx } from '../ui';

const NAV = [
  { to: '/today', label: 'Today', icon: 'home' },
  { to: '/assistant', label: 'Assistant', icon: 'spark' },
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
        <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-butter text-[13px] font-bold text-ink">
          {(user?.name || '?').charAt(0).toUpperCase()}
        </span>
        <Icon name="chevronDown" size={14} className="text-ink-3" />
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
  ok: { ring: '#D2F27C', text: 'text-ok' },
  watch: { ring: '#F6D38B', text: 'text-watch' },
  act: { ring: '#F4A48C', text: 'text-act' },
  neutral: { ring: '#E4E4DE', text: 'text-ink-3' },
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
        <span
          className="grid h-9 w-9 place-items-center rounded-full text-[14px] font-bold text-ink"
          style={{ background: t.ring, boxShadow: `0 0 0 2px #F5F4EF, 0 0 0 4px ${t.ring}` }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block font-serif text-[17px] leading-tight text-ink">{name}</span>
        <span className={cx('block truncate text-[11px] font-medium', t.text)}>
          {where}
          {data && <span className="text-ink-3"> · {ago(data.minutes_since_update)}</span>}
        </span>
      </span>
    </Link>
  );
}

// A sky-blue pill that glides to the active page.
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
    <nav className={cx('relative flex items-center rounded-full p-1', dock ? 'w-full justify-between' : '')}>
      {pill && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1 rounded-full bg-rose transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
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
              'relative z-10 flex items-center rounded-full font-medium transition-colors duration-300',
              dock ? 'h-12 flex-1 flex-col justify-center gap-0.5 text-[10.5px]' : 'h-9 gap-2 px-4 text-[13px]',
              isActive ? 'text-ink' : dock ? 'text-white/60 hover:text-white' : 'text-ink-2 hover:text-ink'
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

const PART_LABEL = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' };

function partOfDay(t = Date.now()) {
  const h = new Date(t).getHours();
  return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 21 ? 'evening' : 'night';
}

function Clock({ now, part }) {
  return (
    <div className="hidden text-right leading-tight xl:block">
      <p className="font-serif text-[17px] tabular-nums text-ink">
        {new Date(now).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
      </p>
      <p className="flex items-center justify-end gap-1.5 text-[11px] font-medium text-ink-3">
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
      className="relative grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-black/[0.05]"
    >
      <Icon name="bell" size={16} />
      {n > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[9px] font-semibold text-white">{n > 9 ? '9+' : n}</span>}
    </Link>
  );
}

// Off-white tiles floating on the pale blue page.
// Today lays out its own tiles; every other page gets one off-white sheet to sit on.
export default function Layout({ children }) {
  const now = useNow();
  const part = partOfDay(now);
  const { pathname } = useLocation();
  const tiles = pathname.startsWith('/today') || pathname.startsWith('/log') || pathname.startsWith('/assistant');

  return (
    <div className="relative min-h-full p-2 sm:p-4 lg:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-[1760px] flex-col">
        <header className="sticky top-2 z-[900] sm:top-4 lg:top-6">
          <div className="relative flex h-16 items-center gap-3 rounded-[20px] bg-paper shadow-[0_10px_30px_-18px_rgba(30,50,80,0.35)] pl-3 pr-2 text-ink sm:gap-5 sm:pl-6 sm:pr-3">
            <Link to="/today" className="hidden shrink-0 items-center gap-2.5 sm:flex">
              <span className="text-[19px] font-semibold uppercase tracking-[0.2em] text-ink">Assist</span>
            </Link>
            <PatientChip />
            <div className="mx-auto hidden lg:block">
              <Nav />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3 lg:ml-0">
              <Clock now={now} part={part} />
              <span className="hidden h-7 w-px bg-line xl:block" />
              <NotificationCenter />
              <AccountMenu />
            </div>
          </div>
        </header>
        <main className="mt-3 w-full flex-1 pb-24 lg:pb-0">
          {tiles ? children : <div className="min-h-full rounded-[20px] bg-paper p-4 sm:p-6 lg:p-8">{children}</div>}
        </main>
      </div>
      {/* Below lg the nav moves to a floating dock at the thumb, like a phone app. */}
      <div className="fixed inset-x-3 bottom-3 z-[900] lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto max-w-md rounded-[22px] glass-dark p-1">
          <Nav dock />
        </div>
      </div>
    </div>
  );
}
