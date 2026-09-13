import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon, BrandLockup, Brandmark } from '../ui';

// The shell. Two distinct navigation shapes, both taken from the SellerApp
// theme: on wide screens a floating rounded panel pinned to the left, on
// narrow screens the 30dp-rounded-top bottom bar in `surface-fill` that is
// SellerApp's bottom_style.xml almost literally.
//
// Seven flat top-level destinations overflowed the bottom bar at phone width,
// so the three "configure once" destinations (safe zones, faces, devices) are
// grouped under a single "Setup" hub. The bottom bar and desktop sidebar both
// show five top-level items; the sidebar additionally lists the Setup group's
// children inline so a caregiver can reach a zone in one click without first
// landing on the hub.

const NAV_ITEMS = [
  { to: '/today', label: 'Today', short: 'Today', icon: 'heart' },
  { to: '/timeline', label: 'Timeline', short: 'Timeline', icon: 'timeline' },
  { to: '/alerts', label: 'Alerts', short: 'Alerts', icon: 'bell' },
  { to: '/quiz-history', label: 'Daily quiz', short: 'Quiz', icon: 'spark' },
  {
    to: '/setup',
    label: 'Setup',
    short: 'Setup',
    icon: 'settings',
    // Any of these routes count as "inside Setup" for the collapsed bottom bar.
    matchPaths: ['/setup', '/geofences', '/faces', '/devices/register'],
  },
];

const SETUP_CHILDREN = [
  { to: '/geofences', label: 'Safe zones' },
  { to: '/faces', label: 'Familiar faces' },
  { to: '/devices/register', label: 'Devices' },
];

function isPathActive(pathname, paths) {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function initialsOf(name) {
  if (!name) return 'C';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function SidebarLink({ item, active }) {
  return (
    <Link
      to={item.to}
      className={[
        'group relative flex items-center gap-3 overflow-hidden rounded-pill py-2.5 pl-4 pr-3',
        'text-[15px] font-bold transition-colors duration-150',
        active ? 'bg-sage-100 text-sage-800' : 'text-ink-soft hover:bg-surface-sunken hover:text-ink',
      ].join(' ')}
    >
      {/* The same 4px left rail the entry cards use, so "selected" and
          "typed" read as one idea across the whole product. */}
      <span
        aria-hidden="true"
        className={[
          'absolute inset-y-1.5 left-0 w-1 rounded-pill transition-opacity duration-150',
          active ? 'bg-sage opacity-100' : 'bg-sage opacity-0',
        ].join(' ')}
      />
      <Icon name={item.icon} size={19} className={active ? 'text-sage-700' : 'text-ink-faint group-hover:text-sage-700'} />
      {item.label}
    </Link>
  );
}

/** Quieter nested link for a Setup child, deliberately without an icon tile
 * so the sub-list reads as one visual step down from the top-level items. */
function SidebarSubLink({ item, active }) {
  return (
    <Link
      to={item.to}
      className={[
        'block rounded-pill px-4 py-2 text-[13.5px] font-bold transition-colors duration-150',
        active ? 'bg-sage-50 text-sage-800' : 'text-ink-faint hover:text-ink-soft',
      ].join(' ')}
    >
      {item.label}
    </Link>
  );
}

function BottomLink({ item, active }) {
  return (
    <Link
      to={item.to}
      className={[
        'flex flex-1 flex-col items-center gap-1 rounded-pill px-1 py-2 text-[11px] font-bold',
        'transition-colors duration-150',
        active ? 'text-sage-800' : 'text-ink-faint',
      ].join(' ')}
    >
      <span
        className={[
          'grid h-8 w-12 place-items-center rounded-pill transition-colors duration-150',
          active ? 'bg-surface shadow-card' : '',
        ].join(' ')}
      >
        <Icon name={item.icon} size={19} />
      </span>
      {item.short}
    </Link>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

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
            {NAV_ITEMS.map((item) => {
              if (item.to !== '/setup') {
                return <SidebarLink key={item.to} item={item} active={isPathActive(pathname, [item.to])} />;
              }
              const parentActive = isPathActive(pathname, ['/setup']);
              return (
                <div key={item.to}>
                  <SidebarLink item={item} active={parentActive} />
                  <div className="ml-6 mt-1 space-y-0.5 border-l border-line pl-3">
                    {SETUP_CHILDREN.map((child) => (
                      <SidebarSubLink
                        key={child.to}
                        item={child}
                        active={isPathActive(pathname, [child.to])}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
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
          bgdark fill. Exactly five destinations; the three setup screens are
          reached through the Setup hub instead of their own bottom-bar slot. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch gap-0.5 rounded-t-panel bg-surface-fill px-2 pb-2 pt-2 shadow-bar lg:hidden">
        {NAV_ITEMS.map((item) => (
          <BottomLink
            key={item.to}
            item={item}
            active={isPathActive(pathname, item.matchPaths || [item.to])}
          />
        ))}
      </nav>
    </div>
  );
}

export { Brandmark };
