import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';

function ViewHours({ user, onLogout }) {
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Edit modal state
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', timeIn: '', timeOut: '', item: '' });
  const [saving, setSaving] = useState(false);

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

  const calculateMinutes = (timeIn, timeOut) => {
    const [inHours, inMinutes] = timeIn.split(':').map(Number);
    const [outHours, outMinutes] = timeOut.split(':').map(Number);
    const inTotal = inHours * 60 + inMinutes;
    const outTotal = outHours * 60 + outMinutes;
    return outTotal - inTotal;
  };

  const formatMinutes = (totalMinutes) => {
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const calculateHours = (timeIn, timeOut) => {
    return formatMinutes(calculateMinutes(timeIn, timeOut));
  };

  const getAggregateHours = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let weekMinutes = 0;
    let monthMinutes = 0;
    let yearMinutes = 0;
    let totalMinutes = 0;

    hours.forEach((entry) => {
      const entryDate = new Date(entry.date + 'T00:00:00');
      const mins = calculateMinutes(entry.time_in, entry.time_out);

      totalMinutes += mins;

      if (entryDate >= startOfYear) {
        yearMinutes += mins;
      }
      if (entryDate >= startOfMonth) {
        monthMinutes += mins;
      }
      if (entryDate >= startOfWeek) {
        weekMinutes += mins;
      }
    });

    return {
      week: formatMinutes(weekMinutes),
      month: formatMinutes(monthMinutes),
      year: formatMinutes(yearMinutes),
      total: formatMinutes(totalMinutes)
    };
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getHoursForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return hours.filter(entry => entry.date === dateStr);
  };

  const getTotalMinutesForDate = (date) => {
    const entries = getHoursForDate(date);
    return entries.reduce((sum, entry) => sum + calculateMinutes(entry.time_in, entry.time_out), 0);
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
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

  // Edit/Delete handlers
  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setEditForm({
      date: entry.date,
      timeIn: entry.time_in,
      timeOut: entry.time_out,
      item: entry.item || ''
    });
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setEditForm({ date: '', timeIn: '', timeOut: '', item: '' });
  };

  const handleSaveEdit = async () => {
    if (!editForm.date || !editForm.timeIn || !editForm.timeOut) {
      setError('Please fill in all required fields');
      return;
    }

    if (editForm.timeOut <= editForm.timeIn) {
      setError('Time out must be after time in');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/hours/${editingEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update entry');
      }

      setSuccess('Entry updated successfully!');
      setEditingEntry(null);
      fetchHours();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete this entry from ${formatDate(entry.date)}?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/hours/${entry.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete entry');
      }

      setSuccess('Entry deleted successfully!');
      fetchHours();
    } catch (err) {
      setError(err.message);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const totalMins = getTotalMinutesForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const hasHours = totalMins > 0;

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} ${hasHours ? 'has-hours' : ''}`}
        >
          <span className="day-number">{day}</span>
          {hasHours && (
            <span className="day-hours">{formatMinutes(totalMins)}</span>
          )}
        </div>
      );
    }

    return (
      <div className="calendar-container">
        <div className="calendar-header">
          <button className="btn" onClick={() => navigateMonth(-1)}>&lt;</button>
          <h2 style={{ margin: 0, color: '#22c55e' }}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button className="btn" onClick={() => navigateMonth(1)}>&gt;</button>
        </div>
        <div className="calendar-grid">
          {dayNames.map(name => (
            <div key={name} className="calendar-day-name">{name}</div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  const renderList = () => {
    if (hours.length === 0) {
      return <p style={{ textAlign: 'center', color: '#4ade80' }}>No hours logged yet.</p>;
    }

    const grouped = {};
    hours.forEach(entry => {
      const date = new Date(entry.date + 'T00:00:00');
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(entry);
    });

    const sortedKeys = Object.keys(grouped).sort().reverse();

    return (
      <div className="hours-list">
        {sortedKeys.map(key => {
          const [year, month] = key.split('-');
          const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          const entries = grouped[key];
          const monthTotal = entries.reduce((sum, e) => sum + calculateMinutes(e.time_in, e.time_out), 0);

          return (
            <div key={key} className="month-group">
              <div className="month-header">
                <span>{monthName}</span>
                <span className="month-total">{formatMinutes(monthTotal)}</span>
              </div>

              {/* Desktop Table View */}
              <div className="hours-table-desktop" style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time In</th>
                      <th>Time Out</th>
                      <th>Hours</th>
                      <th style={{ width: '120px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.date)}</td>
                        <td>{formatTime(entry.time_in)}</td>
                        <td>{formatTime(entry.time_out)}</td>
                        <td>{calculateHours(entry.time_in, entry.time_out)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn btn-small"
                              onClick={() => handleEdit(entry)}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-small"
                              onClick={() => handleDelete(entry)}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="hours-table-mobile">
                {entries.map((entry) => (
                  <div key={entry.id} className="hours-entry-card">
                    <div className="hours-entry-header">
                      <span className="hours-entry-date">{formatDate(entry.date)}</span>
                      <span className="hours-entry-duration">{calculateHours(entry.time_in, entry.time_out)}</span>
                    </div>
                    <div className="hours-entry-times">
                      {formatTime(entry.time_in)} - {formatTime(entry.time_out)}
                    </div>
                    {entry.item && (
                      <div className="hours-entry-item">{entry.item}</div>
                    )}
                    <div className="hours-entry-actions">
                      <button
                        className="btn btn-small"
                        onClick={() => handleEdit(entry)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleDelete(entry)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div>
        <Navbar user={user} onLogout={onLogout} />
        <div className="container">
          <p style={{ color: '#22c55e' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const aggregates = getAggregateHours();

  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      <div className="container">
        <h1 className="page-title">My Hours</h1>

        {error && <div className="card"><div className="error-message">{error}</div></div>}
        {success && <div className="card"><div className="success-message">{success}</div></div>}

        {/* Edit Modal */}
        {editingEntry && (
          <div className="modal-overlay" onClick={handleCancelEdit}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2 style={{ marginBottom: '16px', color: '#22c55e' }}>Edit Entry</h2>
              <div className="form-group">
                <label htmlFor="edit-date">Date</label>
                <input
                  type="date"
                  id="edit-date"
                  className="input"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label htmlFor="edit-timeIn">Time In</label>
                  <input
                    type="time"
                    id="edit-timeIn"
                    className="input"
                    value={editForm.timeIn}
                    onChange={(e) => setEditForm({ ...editForm, timeIn: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-timeOut">Time Out</label>
                  <input
                    type="time"
                    id="edit-timeOut"
                    className="input"
                    value={editForm.timeOut}
                    onChange={(e) => setEditForm({ ...editForm, timeOut: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="edit-item">Activity/Item (optional)</label>
                <input
                  type="text"
                  id="edit-item"
                  className="input"
                  value={editForm.item}
                  onChange={(e) => setEditForm({ ...editForm, item: e.target.value })}
                  placeholder="What did you work on?"
                />
              </div>
              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveEdit}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Aggregate Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">This Week</div>
            <div className="stat-value">{aggregates.week}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">This Month</div>
            <div className="stat-value">{aggregates.month}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">This Year</div>
            <div className="stat-value">{aggregates.year}</div>
          </div>
          <div className="stat-card highlight">
            <div className="stat-label">All Time</div>
            <div className="stat-value">{aggregates.total}</div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            Calendar
          </button>
          <button
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
        </div>

        {/* Content */}
        <div className="card">
          {viewMode === 'calendar' ? renderCalendar() : renderList()}
        </div>
      </div>
    </div>
  );
}

export default ViewHours;
