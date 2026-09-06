import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from './Layout.jsx';

function PatientRoleBlocked() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-semibold text-slate-800">Wrong app for this account</h1>
        <p className="text-slate-600">
          This dashboard is for family caregivers — please use the companion app on your phone
          instead.
        </p>
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
