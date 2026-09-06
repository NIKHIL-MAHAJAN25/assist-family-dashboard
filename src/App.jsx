import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Timeline from './pages/Timeline.jsx';
import Alerts from './pages/Alerts.jsx';
import GeofenceZones from './pages/GeofenceZones.jsx';
import Faces from './pages/Faces.jsx';
import QuizHistory from './pages/QuizHistory.jsx';
import DeviceRegistration from './pages/DeviceRegistration.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/geofences" element={<GeofenceZones />} />
        <Route path="/faces" element={<Faces />} />
        <Route path="/quiz-history" element={<QuizHistory />} />
        <Route path="/devices/register" element={<DeviceRegistration />} />
      </Route>

      <Route path="/" element={<Navigate to="/timeline" replace />} />
      <Route path="*" element={<Navigate to="/timeline" replace />} />
    </Routes>
  );
}
