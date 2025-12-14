import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { formatDateWithWeekday, formatTime, calculateMinutes, formatMinutes, calculateHours } from '../utils/formatters';
import { HOUR_TYPES, getHourTypeLabel, getHourTypeColor } from '../utils/hourTypes';

// Helper to get date string in local timezone (YYYY-MM-DD format)
const getLocalDateString = (date = new Date()) => {
  return date.toLocaleDateString('en-CA');
};

function AdminStudentProfile() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Edit modal state
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', timeIn: '', timeOut: '', item: '', hourType: 'other' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  const fetchStudentData = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch student info
      const studentRes = await fetch(`/api/students/${studentId}`);
      if (!studentRes.ok) {
        throw new Error('Student not found');
      }
      const studentData = await studentRes.json();
      setStudent(studentData);

      // Fetch student's hours
      const hoursRes = await fetch(`/api/hours/student/${studentId}`);
      if (!hoursRes.ok) {
        throw new Error('Failed to fetch hours');
      }
      const hoursData = await hoursRes.json();
      setHours(hoursData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit/Delete handlers
  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setEditForm({
      date: entry.date,
      timeIn: entry.time_in,
      timeOut: entry.time_out,
      item: entry.item || '',
      hourType: entry.hour_type || 'other'
    });
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setEditForm({ date: '', timeIn: '', timeOut: '', item: '', hourType: 'other' });
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
      fetchStudentData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete this entry from ${formatDateWithWeekday(entry.date)}?`)) {
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
      fetchStudentData();
    } catch (err) {
      setError(err.message);
    }
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

  const getHoursByType = () => {
    const byType = {};
    HOUR_TYPES.forEach(type => {
      byType[type.value] = 0;
    });

    hours.forEach(entry => {
      const mins = calculateMinutes(entry.time_in, entry.time_out);
      const type = entry.hour_type || 'other';
      if (byType[type] !== undefined) {
        byType[type] += mins;
      } else {
        byType['other'] += mins;
      }
    });

    return byType;
  };

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
    setSelectedDate(null);
  };

  const handleDateClick = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
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
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

      days.push(
        <button
          key={day}
          type="button"
          className={`calendar-day clickable ${isToday ? 'today' : ''} ${hasHours ? 'has-hours' : ''} ${isSelected ? 'selected' : ''}`}
          onClick={() => handleDateClick(day)}
        >
          <span className="day-number">{day}</span>
          {hasHours && (
            <span className="day-hours">{formatMinutes(totalMins)}</span>
          )}
        </button>
      );
    }

    return (
      <div className="calendar-container">
        <div className="calendar-header">
          <button className="btn" onClick={() => navigateMonth(-1)}>&lt;</button>
          <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>
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

  const renderSelectedDateEntries = () => {
    if (!selectedDate) return null;

    const entries = getHoursForDate(selectedDate);
    if (entries.length === 0) {
      return (
        <div className="card" style={{ marginTop: '16px' }}>
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>No hours logged on this day</p>
        </div>
      );
    }

    return (
      <div className="card" style={{ marginTop: '16px' }}>
        <h3 style={{ color: 'var(--color-primary)', marginBottom: '12px' }}>
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h3>
        {entries.map(entry => (
          <div key={entry.id} style={{
            padding: '12px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '8px',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span
                style={{
                  backgroundColor: getHourTypeColor(entry.hour_type),
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                {getHourTypeLabel(entry.hour_type)}
              </span>
              <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>
                {calculateHours(entry.time_in, entry.time_out)}
              </span>
            </div>
            <div style={{ color: 'var(--color-text-muted)' }}>
              {formatTime(entry.time_in)} - {formatTime(entry.time_out)}
            </div>
            {entry.item && (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '4px' }}>
                {entry.item}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderList = () => {
    if (hours.length === 0) {
      return <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No hours logged yet.</p>;
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
                      <th>Type</th>
                      <th>Time In</th>
                      <th>Time Out</th>
                      <th>Hours</th>
                      <th>Activity</th>
                      <th style={{ width: '120px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{formatDateWithWeekday(entry.date)}</td>
                        <td>
                          <span
                            style={{
                              backgroundColor: getHourTypeColor(entry.hour_type),
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          >
                            {getHourTypeLabel(entry.hour_type)}
                          </span>
                        </td>
                        <td>{formatTime(entry.time_in)}</td>
                        <td>{formatTime(entry.time_out)}</td>
                        <td>{calculateHours(entry.time_in, entry.time_out)}</td>
                        <td style={{ color: 'var(--color-text-muted)' }}>{entry.item || '-'}</td>
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
                      <span className="hours-entry-date">{formatDateWithWeekday(entry.date)}</span>
                      <span className="hours-entry-duration">{calculateHours(entry.time_in, entry.time_out)}</span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <span
                        style={{
                          backgroundColor: getHourTypeColor(entry.hour_type),
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      >
                        {getHourTypeLabel(entry.hour_type)}
                      </span>
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

  const renderTypeBreakdown = () => {
    const byType = getHoursByType();
    const totalMinutes = Object.values(byType).reduce((sum, mins) => sum + mins, 0);

    return (
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ color: 'var(--color-primary)', marginBottom: '16px' }}>Hours by Type</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {HOUR_TYPES.map(type => {
            const minutes = byType[type.value] || 0;
            const percentage = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0;

            return (
              <div key={type.value}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '2px',
                        backgroundColor: type.color
                      }}
                    ></span>
                    {type.label}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{formatMinutes(minutes)}</span>
                </div>
                <div style={{
                  height: '8px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${percentage}%`,
                    backgroundColor: type.color,
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <p style={{ color: 'var(--color-primary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <button
            className="btn"
            onClick={() => navigate('/admin/hours')}
            style={{ marginBottom: '16px' }}
          >
            &larr; Back to Hours
          </button>
          <div className="card">
            <div className="error-message">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  const aggregates = getAggregateHours();

  return (
    <div>
      <Navbar />
      <div className="container">
        <button
          className="btn"
          onClick={() => navigate('/admin/hours')}
          style={{ marginBottom: '16px' }}
        >
          &larr; Back to Hours
        </button>

        {error && <div className="card"><div className="error-message">{error}</div></div>}
        {success && <div className="card"><div className="success-message">{success}</div></div>}

        {/* Edit Modal */}
        {editingEntry && (
          <div className="modal-overlay" onClick={handleCancelEdit}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2 style={{ marginBottom: '16px', color: 'var(--color-primary)' }}>Edit Entry</h2>
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
              <div className="form-group">
                <label htmlFor="edit-hourType">Type</label>
                <select
                  id="edit-hourType"
                  className="input"
                  value={editForm.hourType}
                  onChange={(e) => setEditForm({ ...editForm, hourType: e.target.value })}
                  required
                >
                  {HOUR_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
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
                  placeholder="What did they work on?"
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <h1 className="page-title" style={{ margin: 0 }}>{student?.name}</h1>
          <div style={{ color: 'var(--color-primary)', fontSize: '24px', fontWeight: 'bold' }}>
            Total: {aggregates.total}
          </div>
        </div>

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

        {/* Type Breakdown */}
        {renderTypeBreakdown()}

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
          {viewMode === 'calendar' ? (
            <>
              {renderCalendar()}
              {renderSelectedDateEntries()}
            </>
          ) : (
            renderList()
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminStudentProfile;
