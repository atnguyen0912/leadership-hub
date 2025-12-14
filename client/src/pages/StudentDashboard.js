import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { formatDecimalHours } from '../utils/formatters';
import { useAuth } from '../contexts';

function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [user.studentId]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/hours/stats/${user.studentId}`);
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="container">
        <h1 className="page-title">Student Dashboard</h1>

        {/* Stats Cards */}
        {!loading && stats && (
          <div className="stats-grid">
            <div className="stat-card stat-card-primary">
              <div className="stat-value">{formatDecimalHours(stats.totalHours)}</div>
              <div className="stat-label">Total Hours</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{formatDecimalHours(stats.monthHours)}</div>
              <div className="stat-label">This Month</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{formatDecimalHours(stats.weekHours)}</div>
              <div className="stat-label">This Week</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalEntries}</div>
              <div className="stat-label">Log Entries</div>
            </div>
          </div>
        )}

        <div className="menu-grid">
          <Link to="/log-hours" className="menu-card">
            <div className="menu-card-icon">📝</div>
            <div className="menu-card-title">Log Hours</div>
          </Link>
          <Link to="/view-hours" className="menu-card">
            <div className="menu-card-icon">📊</div>
            <div className="menu-card-title">View My Hours</div>
          </Link>
          <Link to="/events" className="menu-card">
            <div className="menu-card-icon">📅</div>
            <div className="menu-card-title">Events</div>
          </Link>
          <Link to="/cashbox" className="menu-card">
            <div className="menu-card-icon">🍿</div>
            <div className="menu-card-title">Concessions</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
