import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';

function ViewHours({ user, onLogout }) {
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHours();
  }, []);

  const fetchHours = async () => {
    try {
      const response = await fetch(`/api/hours/student/${user.studentId}`);
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

  const calculateTotalHours = () => {
    let totalMinutes = 0;
    hours.forEach((entry) => {
      const [inHours, inMinutes] = entry.time_in.split(':').map(Number);
      const [outHours, outMinutes] = entry.time_out.split(':').map(Number);
      const inTotal = inHours * 60 + inMinutes;
      const outTotal = outHours * 60 + outMinutes;
      totalMinutes += outTotal - inTotal;
    });
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    return `${totalHours}h ${remainingMinutes}m`;
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

  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      <div className="container">
        <h1 className="page-title">My Hours</h1>

        {error && <div className="error-message">{error}</div>}

        <div className="card">
          {hours.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>No hours logged yet.</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time In</th>
                      <th>Time Out</th>
                      <th>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hours.map((entry) => (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.date)}</td>
                        <td>{formatTime(entry.time_in)}</td>
                        <td>{formatTime(entry.time_out)}</td>
                        <td>{calculateHours(entry.time_in, entry.time_out)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="total-hours">
                Total Hours: {calculateTotalHours()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ViewHours;
