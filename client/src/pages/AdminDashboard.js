import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

function AdminDashboard({ user, onLogout }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/hours/stats');
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

  const exportToCSV = () => {
    if (!stats) return;

    const headers = ['Rank', 'Name', 'Student ID', 'Total Hours', 'This Month', 'This Week', 'Entries'];
    const rows = stats.leaderboard.map((s, i) => [
      i + 1,
      s.name,
      s.studentId,
      s.totalHours,
      s.monthHours,
      s.weekHours,
      s.entries
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leadership-hours-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const displayedLeaderboard = showFullLeaderboard
    ? stats?.leaderboard
    : stats?.leaderboard?.slice(0, 5);

  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      <div className="container">
        <h1 className="page-title">Admin Dashboard</h1>

        {/* Class Stats */}
        {!loading && stats && (
          <>
            <div className="stats-grid">
              <div className="stat-card stat-card-primary">
                <div className="stat-value">{stats.classStats.totalHours}</div>
                <div className="stat-label">Class Total Hours</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.classStats.averageHours}</div>
                <div className="stat-label">Avg per Student</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.classStats.monthHours}</div>
                <div className="stat-label">This Month</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.classStats.totalStudents}</div>
                <div className="stat-label">Total Students</div>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#22c55e' }}>Hours Leaderboard</h2>
                <button className="btn btn-small" onClick={exportToCSV}>
                  Export CSV
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th>Student</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'right' }}>Month</th>
                      <th style={{ textAlign: 'right' }}>Week</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedLeaderboard?.map((student, index) => (
                      <tr key={student.studentId}>
                        <td>
                          {index === 0 && student.totalHours > 0 ? '🥇' :
                           index === 1 && student.totalHours > 0 ? '🥈' :
                           index === 2 && student.totalHours > 0 ? '🥉' :
                           index + 1}
                        </td>
                        <td>
                          <span style={{ fontWeight: index < 3 ? 600 : 400 }}>{student.name}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#22c55e' }}>
                          {student.totalHours}h
                        </td>
                        <td style={{ textAlign: 'right', color: '#4ade80' }}>
                          {student.monthHours}h
                        </td>
                        <td style={{ textAlign: 'right', color: '#4a7c59' }}>
                          {student.weekHours}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {stats.leaderboard.length > 5 && (
                <button
                  className="btn btn-small"
                  onClick={() => setShowFullLeaderboard(!showFullLeaderboard)}
                  style={{ marginTop: '12px', width: '100%', background: '#333' }}
                >
                  {showFullLeaderboard ? 'Show Less' : `Show All (${stats.leaderboard.length})`}
                </button>
              )}
            </div>
          </>
        )}

        <div className="menu-grid">
          <Link to="/manage-students" className="menu-card">
            <div className="menu-card-icon">👥</div>
            <div className="menu-card-title">Manage Students</div>
          </Link>
          <Link to="/view-all-hours" className="menu-card">
            <div className="menu-card-icon">📋</div>
            <div className="menu-card-title">View All Hours</div>
          </Link>
          <Link to="/events-admin" className="menu-card">
            <div className="menu-card-icon">📅</div>
            <div className="menu-card-title">Events</div>
          </Link>
          <Link to="/cashbox-admin" className="menu-card">
            <div className="menu-card-icon">💰</div>
            <div className="menu-card-title">CashBox</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
