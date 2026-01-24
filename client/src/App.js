import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, ThemeProvider } from './contexts';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import LogHours from './pages/LogHours';
import ViewHours from './pages/ViewHours';
import Events from './pages/Events';
import AdminDashboard from './pages/AdminDashboard';
import ManageStudents from './pages/ManageStudents';
import ViewAllHours from './pages/ViewAllHours';
import AdminStudentProfile from './pages/AdminStudentProfile';
import EventsAdmin from './pages/EventsAdmin';
import CashBox from './pages/CashBox';
import CashBoxAdmin from './pages/CashBoxAdmin';
import ConcessionSession from './pages/ConcessionSession';
import LossesManagement from './pages/LossesManagement';

function AppRoutes() {
  const { user, isStudent } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
      {isStudent ? (
        <>
          <Route path="/" element={<StudentDashboard />} />
          <Route path="/log-hours" element={<LogHours />} />
          <Route path="/view-hours" element={<ViewHours />} />
          <Route path="/events" element={<Events />} />
          <Route path="/cashbox" element={<CashBox />} />
          <Route path="/concession-session/:id" element={<ConcessionSession />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        <>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/manage-students" element={<ManageStudents />} />
          <Route path="/view-all-hours" element={<ViewAllHours />} />
          <Route path="/admin/hours" element={<ViewAllHours />} />
          <Route path="/admin/student/:studentId" element={<AdminStudentProfile />} />
          <Route path="/events-admin" element={<EventsAdmin />} />
          <Route path="/cashbox" element={<CashBox />} />
          <Route path="/cashbox-admin" element={<CashBoxAdmin />} />
          <Route path="/concession-session/:id" element={<ConcessionSession />} />
          <Route path="/losses" element={<LossesManagement />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
