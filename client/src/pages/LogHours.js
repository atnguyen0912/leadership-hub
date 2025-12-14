import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { HOUR_TYPES } from '../utils/hourTypes';
import { useAuth } from '../contexts';

// Helper to get date string in local timezone (YYYY-MM-DD format)
const getLocalDateString = (date = new Date()) => {
  return date.toLocaleDateString('en-CA'); // en-CA uses YYYY-MM-DD format
};

function LogHours() {
  const { user } = useAuth();
  const [mode, setMode] = useState('today'); // 'today' or 'past'
  const [selectedDate, setSelectedDate] = useState('');
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [item, setItem] = useState('');
  const [hourType, setHourType] = useState('other');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hours, setHours] = useState([]);

  useEffect(() => {
    fetchHours();
  }, []);

  // Set today's date when mode changes to 'today'
  useEffect(() => {
    if (mode === 'today') {
      setSelectedDate(getLocalDateString());
    } else {
      setSelectedDate('');
    }
  }, [mode]);

  const fetchHours = async () => {
    try {
      const response = await fetch(`/api/hours/student/${user.studentId}`);
      const data = await response.json();
      if (response.ok) {
        setHours(data);
      }
    } catch (err) {
      console.error('Failed to fetch hours:', err);
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getHoursForDate = (date) => {
    const dateStr = getLocalDateString(date);
    return hours.filter(entry => entry.date === dateStr);
  };

  const hasHoursOnDate = (date) => {
    return getHoursForDate(date).length > 0;
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const handleDateClick = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(getLocalDateString(date));
  };

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
          item,
          hourType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to log hours');
      }

      setSuccess('Hours logged successfully!');
      setTimeIn('');
      setTimeOut('');
      setItem('');
      setHourType('other');
      fetchHours();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = () => {
    if (!timeIn || !timeOut || timeOut <= timeIn) return null;
    const [inH, inM] = timeIn.split(':').map(Number);
    const [outH, outM] = timeOut.split(':').map(Number);
    const mins = (outH * 60 + outM) - (inH * 60 + inM);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const today = new Date();

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateStr = getLocalDateString(date);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = dateStr === selectedDate;
      const hasHours = hasHoursOnDate(date);
      const isFuture = date > today;

      days.push(
        <button
          key={day}
          type="button"
          className={`calendar-day clickable ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasHours ? 'has-hours' : ''} ${isFuture ? 'future' : ''}`}
          onClick={() => !isFuture && handleDateClick(day)}
          disabled={isFuture}
        >
          <span className="day-number">{day}</span>
        </button>
      );
    }

    return (
      <div className="calendar-container">
        <div className="calendar-header">
          <button type="button" className="btn" onClick={() => navigateMonth(-1)}>&lt;</button>
          <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '16px' }}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button type="button" className="btn" onClick={() => navigateMonth(1)}>&gt;</button>
        </div>
        <div className="calendar-grid compact">
          {dayNames.map(name => (
            <div key={name} className="calendar-day-name">{name}</div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  const duration = calculateDuration();
  const todayStr = getLocalDateString();
  const todayHours = hours.filter(h => h.date === todayStr);

  return (
    <div>
      <Navbar />
      <div className="container">
        <h1 className="page-title">Log Hours</h1>

        {/* Mode Toggle */}
        <div className="view-toggle" style={{ marginBottom: '24px' }}>
          <button
            className={`toggle-btn ${mode === 'today' ? 'active' : ''}`}
            onClick={() => setMode('today')}
          >
            Today
          </button>
          <button
            className={`toggle-btn ${mode === 'past' ? 'active' : ''}`}
            onClick={() => setMode('past')}
          >
            Past Hours
          </button>
        </div>

        {mode === 'today' ? (
          /* Today Mode - Simplified */
          <div className="card" style={{ maxWidth: '500px' }}>
            <div className="today-header">
              <h2>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </h2>
              <span className="today-badge">Today</span>
            </div>

            {todayHours.length > 0 && (
              <div className="logged-entries" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none', marginBottom: '16px' }}>
                <h3 style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '8px' }}>
                  Already logged today:
                </h3>
                {todayHours.map(entry => (
                  <div key={entry.id} className="logged-entry">
                    <span>{entry.item || 'No activity'}</span>
                    <span>
                      {new Date(`2000-01-01T${entry.time_in}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {' - '}
                      {new Date(`2000-01-01T${entry.time_out}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="hourType">Type</label>
                <select
                  id="hourType"
                  className="input"
                  value={hourType}
                  onChange={(e) => setHourType(e.target.value)}
                  required
                >
                  {HOUR_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="item">Activity / Item (optional)</label>
                <input
                  type="text"
                  id="item"
                  className="input"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  placeholder="e.g., Concession Stand, Event Setup"
                />
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

              {duration && (
                <div className="duration-preview">
                  Duration: <strong>{duration}</strong>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Log Hours'}
              </button>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
            </form>
          </div>
        ) : (
          /* Past Mode - Calendar based */
          <div className="log-hours-layout">
            <div className="card">
              {renderCalendar()}
              <div className="calendar-legend">
                <span><span className="legend-dot today"></span> Today</span>
                <span><span className="legend-dot has-hours"></span> Has Hours</span>
                <span><span className="legend-dot selected"></span> Selected</span>
              </div>
            </div>

            <div className="card">
              <h2 style={{ color: 'var(--color-primary)', marginBottom: '16px', fontSize: '18px' }}>
                {selectedDate
                  ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : 'Select a date from the calendar'}
              </h2>

              {selectedDate && (
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="hourType-past">Type</label>
                    <select
                      id="hourType-past"
                      className="input"
                      value={hourType}
                      onChange={(e) => setHourType(e.target.value)}
                      required
                    >
                      {HOUR_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="item-past">Activity / Item (optional)</label>
                    <input
                      type="text"
                      id="item-past"
                      className="input"
                      value={item}
                      onChange={(e) => setItem(e.target.value)}
                      placeholder="e.g., Concession Stand, Event Setup"
                    />
                  </div>

                  <div className="time-inputs">
                    <div className="form-group">
                      <label htmlFor="timeIn-past">Time In</label>
                      <input
                        type="time"
                        id="timeIn-past"
                        className="input"
                        value={timeIn}
                        onChange={(e) => setTimeIn(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="timeOut-past">Time Out</label>
                      <input
                        type="time"
                        id="timeOut-past"
                        className="input"
                        value={timeOut}
                        onChange={(e) => setTimeOut(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {duration && (
                    <div className="duration-preview">
                      Duration: <strong>{duration}</strong>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={loading}
                  >
                    {loading ? 'Submitting...' : 'Log Hours'}
                  </button>

                  {error && <div className="error-message">{error}</div>}
                  {success && <div className="success-message">{success}</div>}
                </form>
              )}

              {selectedDate && getHoursForDate(new Date(selectedDate + 'T00:00:00')).length > 0 && (
                <div className="logged-entries">
                  <h3 style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '8px' }}>
                    Already logged for this day:
                  </h3>
                  {getHoursForDate(new Date(selectedDate + 'T00:00:00')).map(entry => (
                    <div key={entry.id} className="logged-entry">
                      <span>{entry.item || 'No activity'}</span>
                      <span>
                        {new Date(`2000-01-01T${entry.time_in}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {' - '}
                        {new Date(`2000-01-01T${entry.time_out}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LogHours;
