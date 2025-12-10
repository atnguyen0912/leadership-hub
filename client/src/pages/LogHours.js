import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Calendar from '../components/Calendar';

function LogHours({ user, onLogout }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedDate) {
      setError('Please select a date');
      return;
    }

    if (!timeIn || !timeOut) {
      setError('Please enter both time in and time out');
      return;
    }

    if (timeOut <= timeIn) {
      setError('Time out must be after time in');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.studentId,
          date: selectedDate,
          timeIn,
          timeOut,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to log hours');
      }

      setSuccess('Hours logged successfully!');
      setSelectedDate('');
      setTimeIn('');
      setTimeOut('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      <div className="container" style={{ maxWidth: '600px' }}>
        <h1 className="page-title">Log Hours</h1>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Select Date</label>
              <Calendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />
              {selectedDate && (
                <p style={{ marginTop: '8px', color: '#4f46e5', fontWeight: 500 }}>
                  Selected: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>

            <div className="time-inputs">
              <div className="form-group">
                <label htmlFor="timeIn">Time In</label>
                <input
                  type="time"
                  id="timeIn"
                  className="input"
                  value={timeIn}
                  onChange={(e) => setTimeIn(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="timeOut">Time Out</label>
                <input
                  type="time"
                  id="timeOut"
                  className="input"
                  value={timeOut}
                  onChange={(e) => setTimeOut(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Hours'}
            </button>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
          </form>
        </div>
      </div>
    </div>
  );
}

export default LogHours;
