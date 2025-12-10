import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  const location = useLocation();

  return (
    <nav className="nav">
      <div>
        <div className="nav-brand">Leadership Hub</div>
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
          </>
        ) : (
          <>
            <Link to="/manage-students" className={`nav-link ${location.pathname === '/manage-students' ? 'active' : ''}`}>
              Manage Students
            </Link>
            <Link to="/view-all-hours" className={`nav-link ${location.pathname === '/view-all-hours' ? 'active' : ''}`}>
              View All Hours
            </Link>
          </>
        )}
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
