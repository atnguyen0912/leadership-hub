import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import LogHours from './pages/LogHours';
import ViewHours from './pages/ViewHours';
import AdminDashboard from './pages/AdminDashboard';
import ManageStudents from './pages/ManageStudents';
import ViewAllHours from './pages/ViewAllHours';

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Routes>
      {user.type === 'student' ? (
        <>
          <Route path="/" element={<StudentDashboard user={user} onLogout={handleLogout} />} />
          <Route path="/log-hours" element={<LogHours user={user} onLogout={handleLogout} />} />
          <Route path="/view-hours" element={<ViewHours user={user} onLogout={handleLogout} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        <>
          <Route path="/" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
          <Route path="/manage-students" element={<ManageStudents user={user} onLogout={handleLogout} />} />
          <Route path="/view-all-hours" element={<ViewAllHours user={user} onLogout={handleLogout} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}

export default App;
