import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

function AdminDashboard({ user, onLogout }) {
  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      <div className="container">
        <h1 className="page-title">Admin Dashboard</h1>
        <div className="menu-grid">
          <Link to="/manage-students" className="menu-card">
            <div className="menu-card-icon">👥</div>
            <div className="menu-card-title">Manage Students</div>
          </Link>
          <Link to="/view-all-hours" className="menu-card">
            <div className="menu-card-icon">📋</div>
            <div className="menu-card-title">View All Hours</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
