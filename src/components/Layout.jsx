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
      className="flex items-center gap-3 rounded-full py-1 pl-1 pr-4 transition hover:bg-black/[0.04]"
    >
      <span className="relative grid place-items-center">
        <span className="rounded-full p-[2px]" style={{ boxShadow: `0 0 0 2px ${t.ring}` }}>
          <Avatar name={name} size={28} />
        </span>
      </span>
      <span className="leading-tight">
        <span className="block text-[13px] font-semibold text-ink">{name}</span>
        <span className={cx('block whitespace-nowrap text-[11px] font-medium', t.text)}>
          {where}
          {data && <span className="text-ink-4"> · {ago(data.minutes_since_update)}</span>}
        </span>
      </span>
    </Link>
  );
}

// One track with a white pill that glides to the active page.
function Nav() {
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
    // Public Sans may land after first paint and change the tab widths.
    document.fonts?.ready.then(measure);
  }, [pathname]);
  return (
    <nav className="relative flex items-center rounded-full bg-black/[0.035] p-1">
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
              'relative z-10 flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-colors duration-300',
              isActive ? 'text-surface' : 'text-ink-3 hover:text-ink'
            )
          }
        >
          <Icon name={item.icon} size={15} />
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

// A soft wash of colour under the header that follows the time of day, so the page
// never sits on flat grey. Kept faint: it's atmosphere, not decoration.
const AMBIENT = {
  morning: ['rgba(244,170,110,0.30)', 'rgba(250,214,165,0.34)'],
  afternoon: ['rgba(150,190,215,0.30)', 'rgba(200,222,214,0.34)'],
  evening: ['rgba(222,150,170,0.28)', 'rgba(190,170,215,0.28)'],
  night: ['rgba(150,140,195,0.20)', 'rgba(205,170,190,0.18)'],
};

function Ambient({ part }) {
  const [a, b] = AMBIENT[part];
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        background: `radial-gradient(1100px 520px at 12% -8%, ${a}, transparent 62%),
                     radial-gradient(900px 480px at 88% -4%, ${b}, transparent 60%),
                     radial-gradient(700px 400px at 50% 110%, rgba(251,249,246,0.7), transparent 70%)`,
      }}
    />
  );
}

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const fullBleed = pathname.startsWith('/places');
  const now = useNow();
  const part = partOfDay(now);

  return (
    <div className="relative flex min-h-full flex-col">
      <Ambient part={part} />
      <header className="sticky top-0 z-[900] mx-auto w-full max-w-[1760px] px-6 pt-3 lg:px-10">
        <div
          className="relative flex h-[60px] items-center gap-5 rounded-[20px] border border-white/70 bg-surface/70 pl-5 pr-2.5 text-ink shadow-card backdrop-blur-2xl"
          
        >
          {/* time-of-day hairline along the bottom edge */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-16 -bottom-px h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${GLOW[part]}, transparent)` }}
          />
          <Link to="/today" className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="text-lg font-bold tracking-[-0.01em]">Assist</span>
          </Link>
          <PatientChip />
          <div className="mx-auto">
            <Nav />
          </div>
          <div className="flex items-center gap-3">
            <Clock now={now} part={part} />
            <span className="hidden h-7 w-px bg-black/[0.07] xl:block" />
            <Bell />
            <AccountMenu />
          </div>
        </div>
      </header>
      <main className={cx('flex-1', fullBleed ? 'pt-3' : 'mx-auto w-full max-w-[1760px] px-6 pb-8 pt-6 lg:px-10')}>
        {children}
      </main>
    </div>
  );
}
