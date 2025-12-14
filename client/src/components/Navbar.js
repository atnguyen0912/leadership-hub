import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, useTheme } from '../contexts';

function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="nav">
      <div>
        <div className="nav-brand">Hawkins Leadership Hub</div>
        {user.name && <div className="welcome-text">Welcome, {user.name}</div>}
      </div>
      <div className="nav-links">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
          Dashboard
        </Link>
        {user.type === 'student' ? (
          <>
            <Link to="/log-hours" className={`nav-link ${location.pathname === '/log-hours' ? 'active' : ''}`}>
              Log Hours
            </Link>
            <Link to="/view-hours" className={`nav-link ${location.pathname === '/view-hours' ? 'active' : ''}`}>
              View My Hours
            </Link>
            <Link to="/cashbox" className={`nav-link ${location.pathname === '/cashbox' || location.pathname.startsWith('/concession-session') ? 'active' : ''}`}>
              Concessions
            </Link>
          </>
        ) : (
          <>
            <Link to="/manage-students" className={`nav-link ${location.pathname === '/manage-students' ? 'active' : ''}`}>
              Manage Students
            </Link>
            <Link to="/view-all-hours" className={`nav-link ${location.pathname === '/view-all-hours' ? 'active' : ''}`}>
              View All Hours
            </Link>
            <Link to="/cashbox-admin" className={`nav-link ${location.pathname === '/cashbox-admin' ? 'active' : ''}`}>
              CashBox
            </Link>
          </>
        )}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
