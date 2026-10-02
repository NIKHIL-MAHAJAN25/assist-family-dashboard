import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchPatientStatus } from '../api/status.js';
import { Avatar, Icon, Logo, StatusDot, cx } from '../ui';

const NAV = [
  { to: '/today', label: 'Today', icon: 'home' },
  { to: '/log', label: 'Log', icon: 'timeline' },
  { to: '/places', label: 'Places', icon: 'map' },
  { to: '/people', label: 'People', icon: 'people' },
  { to: '/memory', label: 'Memory', icon: 'brain' },
];

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
        className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-white/10"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user?.name} size={28} />
        <Icon name="chevronDown" size={14} className="text-white/60" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-[1000] w-60 overflow-hidden rounded-md border border-line bg-surface text-ink shadow-pop">
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

function PatientChip() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['status', user?.patient_id],
    queryFn: () => fetchPatientStatus(user.patient_id),
    enabled: Boolean(user?.patient_id),
    refetchInterval: 30000,
  });
  const tone = !data
    ? 'neutral'
    : data.location?.inside_safe_zone === false
      ? 'act'
      : data.needs_attention_count > 0 || data.is_stale
        ? 'watch'
        : 'ok';
  return (
    <div className="flex items-center gap-2.5 rounded bg-white/[0.07] py-1 pl-1 pr-3">
      <Avatar name={user?.patient_name || data?.patient?.name || 'Patient'} size={26} />
      <span className="text-sm font-semibold text-white">
        {user?.patient_name || data?.patient?.name || 'Patient'}
      </span>
      <StatusDot tone={tone} pulse={tone === 'act'} />
    </div>
  );
}

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const fullBleed = pathname.startsWith('/places');

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-[900] bg-ink text-white">
        <div className="mx-auto flex h-14 max-w-[1760px] items-center gap-6 px-6 lg:px-10">
          <NavLink to="/today" className="flex items-center gap-2.5">
            <Logo size={26} inverse />
            <span className="text-lg font-bold tracking-[-0.01em]">Assist</span>
          </NavLink>
          <span className="h-6 w-px bg-white/15" />
          <PatientChip />
          <nav className="ml-2 flex h-full items-stretch gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cx(
                    'relative flex items-center gap-2 px-3 text-base font-semibold transition-colors',
                    isActive
                      ? 'text-white after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t after:bg-white'
                      : 'text-white/60 hover:text-white'
                  )
                }
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto">
            <AccountMenu />
          </div>
        </div>
      </header>
      <main className={cx('flex-1', !fullBleed && 'mx-auto w-full max-w-[1760px] px-6 py-7 lg:px-10')}>
        {children}
      </main>
    </div>
  );
}
