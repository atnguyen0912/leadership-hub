import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';

function ViewAllHours({ user, onLogout }) {
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllHours();
  }, []);

  const fetchAllHours = async () => {
    try {
      const response = await fetch('/api/hours/all');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch hours');
      }

      setHours(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = (timeIn, timeOut) => {
    const [inHours, inMinutes] = timeIn.split(':').map(Number);
    const [outHours, outMinutes] = timeOut.split(':').map(Number);
    const inTotal = inHours * 60 + inMinutes;
    const outTotal = outHours * 60 + outMinutes;
    const diff = outTotal - inTotal;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Calculate summary by student
  const getStudentSummary = () => {
    const summary = {};
    hours.forEach((entry) => {
      if (!summary[entry.student_id]) {
        summary[entry.student_id] = {
          name: entry.name,
          totalMinutes: 0,
          entries: 0
        };
      }
      const [inHours, inMinutes] = entry.time_in.split(':').map(Number);
      const [outHours, outMinutes] = entry.time_out.split(':').map(Number);
      const inTotal = inHours * 60 + inMinutes;
      const outTotal = outHours * 60 + outMinutes;
      summary[entry.student_id].totalMinutes += outTotal - inTotal;
      summary[entry.student_id].entries++;
    });
    return Object.entries(summary).map(([studentId, data]) => ({
      studentId,
      ...data,
      totalFormatted: `${Math.floor(data.totalMinutes / 60)}h ${data.totalMinutes % 60}m`
    })).sort((a, b) => b.totalMinutes - a.totalMinutes);
  };

  if (loading) {
    return (
      <div>
        <Navbar user={user} onLogout={onLogout} />
        <div className="container">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const studentSummary = getStudentSummary();

  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      <div className="container">
        <h1 className="page-title">All Hours</h1>

        {error && <div className="card"><div className="error-message">{error}</div></div>}

        {/* Summary by Student */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Summary by Student</h2>
          {studentSummary.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>No hours logged yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Student ID</th>
                    <th>Total Hours</th>
                    <th>Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {studentSummary.map((student) => (
                    <tr key={student.studentId}>
                      <td>{student.name}</td>
                      <td>{student.studentId}</td>
                      <td style={{ fontWeight: 600, color: '#4f46e5' }}>{student.totalFormatted}</td>
                      <td>{student.entries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* All Entries */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>All Entries ({hours.length})</h2>
          {hours.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>No hours logged yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Date</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {hours.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <div>{entry.name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{entry.student_id}</div>
                      </td>
                      <td>{formatDate(entry.date)}</td>
                      <td>{formatTime(entry.time_in)}</td>
                      <td>{formatTime(entry.time_out)}</td>
                      <td>{calculateHours(entry.time_in, entry.time_out)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ViewAllHours;
