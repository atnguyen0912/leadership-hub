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
      <div className="student-dashboard">
        <div className="welcome-section">
          <h1>Welcome back, {user.name?.split(' ')[0] || 'Student'}</h1>
        </div>

        {!loading && stats && (
          <>
            {/* Featured Stat */}
            <div className="featured-stat">
              <span className="featured-stat-value">{formatDecimalHours(stats.totalHours)}</span>
              <span className="featured-stat-label">Total Hours Logged</span>
            </div>

            {/* Secondary Stats Row */}
            <div className="stats-row">
              <div className="stat-inline">
                <span className="stat-inline-value">{formatDecimalHours(stats.monthHours)}</span>
                <span className="stat-inline-label">This Month</span>
              </div>
              <div className="stat-inline">
                <span className="stat-inline-value">{formatDecimalHours(stats.weekHours)}</span>
                <span className="stat-inline-label">This Week</span>
              </div>
              <div className="stat-inline">
                <span className="stat-inline-value">{stats.totalEntries}</span>
                <span className="stat-inline-label">Entries</span>
              </div>
            </div>
          </>
        )}

        {/* Action Cards */}
        <div className="action-row">
          <Link to="/log-hours" className="action-card primary">
            <span className="action-icon">📝</span>
            <span className="action-label">Log Hours</span>
          </Link>
          <Link to="/view-hours" className="action-card">
            <span className="action-icon">📊</span>
            <span className="action-label">My Hours</span>
          </Link>
          <Link to="/events" className="action-card">
            <span className="action-icon">📅</span>
            <span className="action-label">Events</span>
          </Link>
          <Link to="/cashbox" className="action-card">
            <span className="action-icon">🍿</span>
            <span className="action-label">Concessions</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
