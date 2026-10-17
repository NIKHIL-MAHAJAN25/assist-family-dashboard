import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Today from './pages/Today.jsx';
import Log from './pages/Log.jsx';
import Places from './pages/Places.jsx';
import People from './pages/People.jsx';
import Memory from './pages/Memory.jsx';
import Settings from './pages/Settings.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Login mode="signup" />} />
      <Route path="/join" element={<Login mode="join" />} />
      <Route path="/join/:code" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/today" element={<Today />} />
        <Route path="/log" element={<Log />} />
        <Route path="/places" element={<Places />} />
        <Route path="/people" element={<People />} />
        <Route path="/memory" element={<Memory />} />
        <Route path="/settings" element={<Settings />} />

        {/* Old routes, kept so existing bookmarks still land somewhere sensible. */}
        <Route path="/timeline" element={<Navigate to="/log" replace />} />
        <Route path="/alerts" element={<Navigate to="/log?show=flagged" replace />} />
        <Route path="/geofences" element={<Navigate to="/places" replace />} />
        <Route path="/faces" element={<Navigate to="/people" replace />} />
        <Route path="/quiz-history" element={<Navigate to="/memory" replace />} />
        <Route path="/setup" element={<Navigate to="/settings" replace />} />
        <Route path="/devices/register" element={<Navigate to="/settings" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes>
  );
}
