import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { formatDecimalHours } from '../utils/formatters';

function AdminDashboard() {
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
      formatDecimalHours(s.totalHours),
      formatDecimalHours(s.monthHours),
      formatDecimalHours(s.weekHours),
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
      <Navbar />
      <div className="dashboard-layout">
        <h1 className="page-title">Admin Dashboard</h1>

        {!loading && stats && (
          <div className="dashboard-grid">
            {/* Left Column - Stats + Quick Actions */}
            <div className="dashboard-sidebar">
              {/* Compact Stats */}
              <div className="card compact-stats">
                <div className="compact-stat primary">
                  <span className="compact-stat-value">{formatDecimalHours(stats.classStats.totalHours)}</span>
                  <span className="compact-stat-label">Total Hours</span>
                </div>
                <div className="compact-stat">
                  <span className="compact-stat-value">{formatDecimalHours(stats.classStats.averageHours)}</span>
                  <span className="compact-stat-label">Avg/Student</span>
                </div>
                <div className="compact-stat">
                  <span className="compact-stat-value">{formatDecimalHours(stats.classStats.monthHours)}</span>
                  <span className="compact-stat-label">This Month</span>
                </div>
                <div className="compact-stat">
                  <span className="compact-stat-value">{stats.classStats.totalStudents}</span>
                  <span className="compact-stat-label">Students</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <Link to="/manage-students" className="quick-action-card">
                  <span className="quick-action-icon">👥</span>
                  <span className="quick-action-label">Students</span>
                </Link>
                <Link to="/view-all-hours" className="quick-action-card">
                  <span className="quick-action-icon">📋</span>
                  <span className="quick-action-label">Hours</span>
                </Link>
                <Link to="/events-admin" className="quick-action-card">
                  <span className="quick-action-icon">📅</span>
                  <span className="quick-action-label">Events</span>
                </Link>
                <Link to="/cashbox-admin" className="quick-action-card">
                  <span className="quick-action-icon">💰</span>
                  <span className="quick-action-label">CashBox</span>
                </Link>
              </div>
            </div>

            {/* Right Column - Leaderboard */}
            <div className="dashboard-main">
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-primary)' }}>Hours Leaderboard</h2>
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
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-primary)' }}>
                            {formatDecimalHours(student.totalHours)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                            {formatDecimalHours(student.monthHours)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--color-text-subtle)' }}>
                            {formatDecimalHours(student.weekHours)}
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
                    style={{ marginTop: '12px', width: '100%', background: 'var(--color-border)' }}
                  >
                    {showFullLeaderboard ? 'Show Less' : `Show All (${stats.leaderboard.length})`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
