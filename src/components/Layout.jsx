import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchPatientStatus } from '../api/status.js';
import { useNow } from '../lib/hooks.js';
import { Icon, cx } from '../ui';

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
        className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-white/[0.08]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-butter text-[13px] font-bold text-ink">
          {(user?.name || '?').charAt(0).toUpperCase()}
        </span>
        <Icon name="chevronDown" size={14} className="text-white/50" />
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

// On the black bar: soft tints that still read as green / amber / red.
const TONE = {
  ok: { ring: '#A3B57A', text: 'text-[#C3D19A]' },
  watch: { ring: '#F2D46B', text: 'text-butter' },
  act: { ring: '#EFA48E', text: 'text-coral' },
  neutral: { ring: '#5A544C', text: 'text-white/50' },
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
      className="flex min-w-0 items-center gap-3 rounded-full py-1 pl-1 pr-2 transition hover:bg-white/[0.06] sm:pr-4"
    >
      <span className="relative grid place-items-center">
        <span
          className="grid h-9 w-9 place-items-center rounded-full text-[14px] font-bold text-ink"
          style={{ background: t.ring, boxShadow: `0 0 0 2px #1E1C1A, 0 0 0 4px ${t.ring}` }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[13px] font-semibold text-white">{name}</span>
        <span className={cx('block truncate text-[11px] font-medium', t.text)}>
          {where}
          {data && <span className="text-white/45"> · {ago(data.minutes_since_update)}</span>}
        </span>
      </span>
    </Link>
  );
}

// One track with a rose pill that glides to the active page.
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
    <nav className={cx('relative flex items-center rounded-full p-1', dock ? 'w-full justify-between' : 'bg-white/[0.07]')}>
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
              'relative z-10 flex items-center rounded-full font-semibold transition-colors duration-300',
              dock ? 'h-12 flex-1 flex-col justify-center gap-0.5 text-[10.5px]' : 'h-9 gap-2 px-4 text-[13px]',
              isActive ? 'text-ink' : 'text-white/60 hover:text-white'
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
      <p className="text-[13px] font-semibold tabular-nums text-white">
        {new Date(now).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
      </p>
      <p className="flex items-center justify-end gap-1.5 text-[11px] font-medium text-white/50">
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
      className="relative grid h-10 w-10 place-items-center rounded-full bg-white/[0.07] text-white/80 transition hover:bg-white/[0.12] hover:text-white"
    >
      <Icon name="bell" size={16} />
      {n > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose ring-2 ring-ink" />}
    </Link>
  );
}

export default function Layout({ children }) {
  const now = useNow();
  const part = partOfDay(now);

  return (
    <div className="relative flex min-h-full flex-col">
      <header className="sticky top-0 z-[900] mx-auto w-full max-w-[1760px] px-3 pt-3 sm:px-6 lg:px-10">
        <div
          className="relative flex h-16 items-center gap-3 rounded-[22px] glass-dark pl-3 pr-2 text-white sm:gap-5 sm:pl-5 sm:pr-3"
        >
          <Link to="/today" className="hidden shrink-0 items-center gap-2.5 sm:flex">
            <span className="text-[22px] font-semibold tracking-[-0.04em] text-white">assist</span>
          </Link>
          <PatientChip />
          <div className="mx-auto hidden lg:block">
            <Nav />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3 lg:ml-0">
            <Clock now={now} part={part} />
            <span className="hidden h-7 w-px bg-white/10 xl:block" />
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
        <div className="mx-auto max-w-md rounded-[22px] glass-dark p-1">
          <Nav dock />
        </div>
      </div>
    </div>
  );
}
