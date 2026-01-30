import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth, ThemeProvider } from './contexts';
import { setSessionExpiredCallback, resetSessionExpirationFlag } from './utils/api';
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

// Session expired notification component
function SessionExpiredBanner({ onDismiss }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      color: 'white',
      padding: '12px 20px',
      textAlign: 'center',
      zIndex: 9999,
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '16px'
    }}>
      <span style={{ fontSize: '14px' }}>
        Your session has expired. Please log in again to continue.
      </span>
      <button
        onClick={onDismiss}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        Dismiss
      </button>
    </div>
  );
}

function AppRoutes() {
  const { user, isStudent, sessionExpired, clearSessionExpired, logout } = useAuth();
  const navigate = useNavigate();

  // Set up API session expiration callback
  useEffect(() => {
    setSessionExpiredCallback(() => {
      logout(true); // true = session expired
      navigate('/', { replace: true });
    });

    return () => {
      setSessionExpiredCallback(null);
    };
  }, [logout, navigate]);

  // Reset session expiration flag when user logs in
  useEffect(() => {
    if (user) {
      resetSessionExpirationFlag();
    }
  }, [user]);

  if (!user) {
    return (
      <>
        {sessionExpired && (
          <SessionExpiredBanner onDismiss={clearSessionExpired} />
        )}
        <div style={{ paddingTop: sessionExpired ? '50px' : 0 }}>
          <Login />
        </div>
      </>
    );
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
