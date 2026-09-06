import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_ITEMS = [
  { to: '/timeline', label: 'Timeline' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/geofences', label: 'Geofence Zones' },
  { to: '/faces', label: 'Face Enrollment' },
  { to: '/quiz-history', label: 'Quiz History' },
  { to: '/devices/register', label: 'Register Device' },
];

function navLinkClasses({ isActive }) {
  return [
    'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-sky-100 text-sky-900'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-white">
        <div className="p-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">Family Dashboard</p>
          {user?.name && <p className="text-xs text-slate-500 truncate">{user.name}</p>}
        </div>
        <nav className="p-2 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClasses}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t border-slate-100 mt-2">
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-left"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
