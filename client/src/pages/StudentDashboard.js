import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

function StudentDashboard({ user, onLogout }) {
  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      <div className="container">
        <h1 className="page-title">Student Dashboard</h1>
        <div className="menu-grid">
          <Link to="/log-hours" className="menu-card">
            <div className="menu-card-icon">📝</div>
            <div className="menu-card-title">Log Hours</div>
          </Link>
          <Link to="/view-hours" className="menu-card">
            <div className="menu-card-icon">📊</div>
            <div className="menu-card-title">View My Hours</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
