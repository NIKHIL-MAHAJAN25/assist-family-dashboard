import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from './Layout.jsx';
import { Brandmark, Button, Icon } from '../ui';

function PatientRoleBlocked() {
  const { logout } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="w-full max-w-md rounded-panel border border-line bg-surface p-10 text-center shadow-card">
        <span className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-pill bg-sage-100 text-sage-700">
          <Icon name="heart" size={28} />
        </span>
        <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">
          This one's for your family
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-faint">
          The dashboard is built for caregivers. Everything you need is on the companion app on
          your phone — it's the one with this leaf on it.
        </p>
        <div className="mt-6 flex justify-center">
          <Brandmark size={44} />
        </div>
        <Button variant="soft" className="mt-8 w-full" icon="logout" onClick={logout}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

export default function ProtectedRoute() {
  const { isAuthenticated, isFamilyCaregiver } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isFamilyCaregiver) {
    return <PatientRoleBlocked />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
