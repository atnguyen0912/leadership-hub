import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, useTheme } from '../contexts';

function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && !e.target.closest('.nav')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  return (
    <nav className="nav">
      <div className="nav-header">
        <div className="nav-brand">Hawkins Leadership Hub</div>
        {user.name && <div className="welcome-text">Welcome, {user.name}</div>}
        <button
          className="nav-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation"
        >
          <span className={`hamburger ${isOpen ? 'open' : ''}`}></span>
        </button>
      </div>
      <div className={`nav-links ${isOpen ? 'open' : ''}`}>
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
            <Link to="/losses" className={`nav-link ${location.pathname === '/losses' ? 'active' : ''}`}>
              Losses
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
