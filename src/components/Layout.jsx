import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon, BrandLockup, Brandmark } from '../ui';

// The shell. Two distinct navigation shapes, both taken from the SellerApp
// theme: on wide screens a floating rounded panel pinned to the left, on
// narrow screens the 30dp-rounded-top bottom bar in `surface-fill` that is
// SellerApp's bottom_style.xml almost literally.

const NAV_ITEMS = [
  { to: '/timeline', label: 'Timeline', short: 'Timeline', icon: 'timeline' },
  { to: '/alerts', label: 'Alerts', short: 'Alerts', icon: 'bell' },
  { to: '/geofences', label: 'Safe zones', short: 'Zones', icon: 'shield' },
  { to: '/faces', label: 'Faces', short: 'Faces', icon: 'faces' },
  { to: '/quiz-history', label: 'Daily quiz', short: 'Quiz', icon: 'spark' },
  { to: '/devices/register', label: 'Devices', short: 'Devices', icon: 'device' },
];

function initialsOf(name) {
  if (!name) return 'C';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function SidebarLink({ item }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        [
          'group relative flex items-center gap-3 overflow-hidden rounded-pill py-2.5 pl-4 pr-3',
          'text-[15px] font-bold transition-colors duration-150',
          isActive
            ? 'bg-sage-100 text-sage-800'
            : 'text-ink-soft hover:bg-surface-sunken hover:text-ink',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {/* The same 4px left rail the entry cards use, so "selected" and
              "typed" read as one idea across the whole product. */}
          <span
            aria-hidden="true"
            className={[
              'absolute inset-y-1.5 left-0 w-1 rounded-pill transition-opacity duration-150',
              isActive ? 'bg-sage opacity-100' : 'bg-sage opacity-0',
            ].join(' ')}
          />
          <Icon
            name={item.icon}
            size={19}
            className={isActive ? 'text-sage-700' : 'text-ink-faint group-hover:text-sage-700'}
          />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

function BottomLink({ item }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        [
          'flex flex-1 flex-col items-center gap-1 rounded-pill px-1 py-2 text-[11px] font-bold',
          'transition-colors duration-150',
          isActive ? 'text-sage-800' : 'text-ink-faint',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={[
              'grid h-8 w-12 place-items-center rounded-pill transition-colors duration-150',
              isActive ? 'bg-surface shadow-card' : '',
            ].join(' ')}
          >
            <Icon name={item.icon} size={19} />
          </span>
          {item.short}
        </>
      )}
    </NavLink>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="relative min-h-screen bg-paper">
      {/* A single soft sage wash behind the top-left corner. It is the only
          decorative element in the whole shell — enough to keep the paper from
          reading as flat white, not enough to compete with content. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px]"
        style={{
          background:
            'radial-gradient(70rem 24rem at 12% -8%, rgba(105,139,106,0.13), transparent 62%)',
        }}
      />

      {/* Mobile top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4 lg:hidden">
        <BrandLockup compact />
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-pill bg-surface-fill px-4 py-2 text-[13px] font-bold text-ink-soft"
        >
          <Icon name="logout" size={16} />
          Log out
        </button>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] gap-7 px-4 lg:px-8">
        {/* Desktop sidebar */}
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-[266px] shrink-0 flex-col rounded-panel border border-line bg-surface p-4 shadow-card lg:flex">
          <div className="px-2 pb-5 pt-2">
            <BrandLockup />
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <SidebarLink key={item.to} item={item} />
            ))}
          </nav>

          <div className="mt-auto">
            <div className="av-divider my-4" />
            <div className="flex items-center gap-3 rounded-card bg-surface-sunken p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-sage text-[14px] font-bold text-white">
                {initialsOf(user?.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-ink">{user?.name || 'Caregiver'}</p>
                <p className="truncate text-[12px] text-ink-faint">Family caregiver</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="mt-2 flex w-full items-center gap-3 rounded-pill px-4 py-2.5 text-left text-[14px] font-bold text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
            >
              <Icon name="logout" size={18} />
              Log out
            </button>
          </div>
        </aside>

        {/* Content column. The generous right/left padding echoes SellerApp's
            5%-guideline gutters rather than running content to the edge. */}
        <main className="min-w-0 flex-1 pb-32 pt-2 lg:py-10">
          <div className="animate-rise-in">{children}</div>
        </main>
      </div>

      {/* Mobile bottom bar — SellerApp's bottom_style.xml: 30dp top corners,
          bgdark fill. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch gap-0.5 rounded-t-panel bg-surface-fill px-2 pb-2 pt-2 shadow-bar lg:hidden">
        {NAV_ITEMS.map((item) => (
          <BottomLink key={item.to} item={item} />
        ))}
      </nav>
    </div>
  );
}

export { Brandmark };
