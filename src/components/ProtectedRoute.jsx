import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from './Layout.jsx';
import { Button, Logo } from '../ui';

function PatientRoleBlocked() {
  const { logout } = useAuth();
  return (
    <div className="flex min-h-full items-center justify-center px-5">
      <div className="panel w-full max-w-md p-10 text-center">
        <div className="mb-6 flex justify-center">
          <Logo size={44} />
        </div>
        <h1 className="text-2xl font-bold">This page is for your family</h1>
        <p className="mt-3 text-md text-ink-3">
          Everything you need is in the Assist app on your phone.
        </p>
        <Button className="mt-8 w-full" icon="logout" onClick={logout}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

export default function ProtectedRoute() {
  const { isAuthenticated, isFamilyCaregiver } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isFamilyCaregiver) return <PatientRoleBlocked />;
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
