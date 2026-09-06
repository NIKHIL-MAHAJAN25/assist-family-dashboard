import React from 'react';

export function LoadingBanner({ label = 'Loading...' }) {
  return <div className="text-sm text-slate-500 py-6">{label}</div>;
}

export function ErrorBanner({ error, label = 'Something went wrong' }) {
  const detail = error?.response?.data?.message || error?.message || 'Unknown error';
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <p className="font-medium">{label}</p>
      <p className="mt-0.5 text-red-600">{detail}</p>
    </div>
  );
}

export function EmptyState({ label = 'Nothing here yet.' }) {
  return <div className="text-sm text-slate-500 py-6">{label}</div>;
}
