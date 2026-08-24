import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { HOUR_TYPES, getHourTypeLabel } from '../utils/hourTypes';
import { useAuth } from '../contexts';

// Helper to get date string in local timezone (YYYY-MM-DD format)
const getLocalDateString = (date = new Date()) => {
  return date.toLocaleDateString('en-CA'); // en-CA uses YYYY-MM-DD format
};

// Format date for display
const formatDateDisplay = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Format time for display
const formatTime = (timeStr) => {
  return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
};

// Calculate duration between two times
const calculateDuration = (timeIn, timeOut) => {
  if (!timeIn || !timeOut || timeOut <= timeIn) return null;
  const [inH, inM] = timeIn.split(':').map(Number);
  const [outH, outM] = timeOut.split(':').map(Number);
  const mins = (outH * 60 + outM) - (inH * 60 + inM);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

function LogHours() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hours, setHours] = useState([]);
  const [expandedDate, setExpandedDate] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [spreadsheetRows, setSpreadsheetRows] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchHours();
  }, []);

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

  const getHoursForDate = (dateStr) => {
    return hours.filter(entry => entry.date === dateStr);
  };

  const hasHoursOnDate = (dateStr) => {
    return getHoursForDate(dateStr).length > 0;
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
    const dateStr = getLocalDateString(date);

    // Toggle expanded view for dates with hours
    if (hasHoursOnDate(dateStr)) {
      if (expandedDate === dateStr) {
        setExpandedDate(null);
        setEditMode(false);
      } else {
        setExpandedDate(dateStr);
        setEditMode(false);
      }
    } else {
      setExpandedDate(null);
      setEditMode(false);
    }

    // Add row to spreadsheet (check if date already exists)
    const existingRow = spreadsheetRows.find(row => row.date === dateStr);
    if (!existingRow) {
      const newRow = {
        id: Date.now(),
        date: dateStr,
        type: 'other',
        item: '',
        timeIn: '',
        timeOut: ''
      };

      // Auto-expand new row on mobile
      if (isMobile) {
        setExpandedRowId(newRow.id);
      }

      // Add and sort by date
      setSpreadsheetRows(prev => {
        const updated = [...prev, newRow];
        return updated.sort((a, b) => a.date.localeCompare(b.date));
      });
    }
  };

  const handleRowChange = (rowId, field, value) => {
    setSpreadsheetRows(prev =>
      prev.map(row => row.id === rowId ? { ...row, [field]: value } : row)
    );
  };

  const handleRemoveRow = (rowId) => {
    setSpreadsheetRows(prev => prev.filter(row => row.id !== rowId));
  };

  const handleClearAll = () => {
    setSpreadsheetRows([]);
    setError('');
    setSuccess('');
  };

  const handleDeleteHour = async (hourId) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    setDeleteLoading(hourId);
    try {
      const response = await fetch(`/api/hours/${hourId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchHours();
        // Check if expanded date still has hours
        if (expandedDate && !getHoursForDate(expandedDate).length) {
          setExpandedDate(null);
          setEditMode(false);
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete entry');
      }
    } catch (err) {
      setError('Failed to delete entry');
    } finally {
      setDeleteLoading(null);
    }
  };

  const validateRow = (row) => {
    if (!row.timeIn || !row.timeOut) return false;
    if (row.timeOut <= row.timeIn) return false;
    return true;
  };

  const handleSaveAll = async () => {
    setError('');
    setSuccess('');

    // Filter valid rows
    const validRows = spreadsheetRows.filter(validateRow);

    if (validRows.length === 0) {
      setError('No valid entries to save. Each row needs Time In and Time Out.');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errors = [];

    for (const row of validRows) {
      try {
        const response = await fetch('/api/hours', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: user.studentId,
            date: row.date,
            timeIn: row.timeIn,
            timeOut: row.timeOut,
            item: row.item,
            hourType: row.type
          })
        });

        if (response.ok) {
          successCount++;
        } else {
          const data = await response.json();
          errors.push(`${formatDateDisplay(row.date)}: ${data.error}`);
        }
      } catch (err) {
        errors.push(`${formatDateDisplay(row.date)}: Network error`);
      }
    }

    setLoading(false);

    if (successCount > 0) {
      setSuccess(`Successfully saved ${successCount} ${successCount === 1 ? 'entry' : 'entries'}!`);
      // Remove successfully saved rows
      setSpreadsheetRows(prev => prev.filter(row => !validateRow(row)));
      fetchHours();
    }

    if (errors.length > 0) {
      setError(errors.join('\n'));
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const today = new Date();
    const todayStr = getLocalDateString(today);

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateStr = getLocalDateString(date);
      const isToday = dateStr === todayStr;
      const isExpanded = dateStr === expandedDate;
      const hasHours = hasHoursOnDate(dateStr);
      const isFuture = date > today;
      const isInSpreadsheet = spreadsheetRows.some(row => row.date === dateStr);

      days.push(
        <button
          key={day}
          type="button"
          className={`calendar-day clickable ${isToday ? 'today' : ''} ${isExpanded ? 'selected' : ''} ${hasHours ? 'has-hours' : ''} ${isFuture ? 'future' : ''} ${isInSpreadsheet ? 'in-spreadsheet' : ''}`}
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
          <button type="button" className="btn btn-sm" onClick={() => navigateMonth(-1)}>&lt;</button>
          <h3 className="calendar-month-title">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button type="button" className="btn btn-sm" onClick={() => navigateMonth(1)}>&gt;</button>
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

  const renderExpandedHours = () => {
    if (!expandedDate) return null;

    const dateHours = getHoursForDate(expandedDate);
    if (dateHours.length === 0) return null;

    const displayDate = new Date(expandedDate + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    return (
      <div className="expanded-hours">
        <div className="expanded-hours-header">
          <h4>{displayDate}</h4>
          <button
            type="button"
            className={`btn btn-sm ${editMode ? 'btn-primary' : ''}`}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? 'Done' : 'Edit'}
          </button>
        </div>
        <div className="expanded-hours-list">
          {dateHours.map(entry => (
            <div key={entry.id} className="expanded-hour-entry">
              <div className="entry-info">
                <span className="entry-time">
                  {formatTime(entry.time_in)} - {formatTime(entry.time_out)}
                </span>
                <span className="entry-type">{getHourTypeLabel(entry.hour_type)}</span>
                {entry.item && <span className="entry-item">{entry.item}</span>}
                <span className="entry-duration">{calculateDuration(entry.time_in, entry.time_out)}</span>
              </div>
              {editMode && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteHour(entry.id)}
                  disabled={deleteLoading === entry.id}
                >
                  {deleteLoading === entry.id ? '...' : 'X'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMobileSpreadsheet = () => {
    return (
      <div className="spreadsheet-section">
        <div className="spreadsheet-header">
          <h2>Add Hours</h2>
          <p className="spreadsheet-hint">Tap dates on the calendar to add entries</p>
        </div>

        {spreadsheetRows.length === 0 ? (
          <div className="spreadsheet-empty">
            <p>No dates selected. Tap on calendar dates to add entries.</p>
          </div>
        ) : (
          <div className="mobile-hours-cards">
            {spreadsheetRows.map(row => {
              const isExpanded = expandedRowId === row.id;
              const duration = calculateDuration(row.timeIn, row.timeOut);
              const isValid = validateRow(row);

              return (
                <div
                  key={row.id}
                  className={`mobile-hours-card ${isExpanded ? 'expanded' : ''} ${!isValid && (row.timeIn || row.timeOut) ? 'invalid' : ''}`}
                >
                  {isExpanded ? (
                    <div className="mobile-card-expanded">
                      <div className="mobile-card-header">
                        <span className="mobile-card-date">
                          {new Date(row.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <button
                          type="button"
                          className="btn-remove-row"
                          onClick={() => handleRemoveRow(row.id)}
                        >
                          X
                        </button>
                      </div>
                      <div className="mobile-card-fields">
                        <label className="mobile-field">
                          <span className="mobile-field-label">Type</span>
                          <select
                            value={row.type}
                            onChange={(e) => handleRowChange(row.id, 'type', e.target.value)}
                            className="input"
                          >
                            {HOUR_TYPES.map(type => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="mobile-field">
                          <span className="mobile-field-label">Activity</span>
                          <input
                            type="text"
                            value={row.item}
                            onChange={(e) => handleRowChange(row.id, 'item', e.target.value)}
                            placeholder="What did you work on?"
                            className="input"
                          />
                        </label>
                        <div className="mobile-time-row">
                          <label className="mobile-field" style={{ flex: 1 }}>
                            <span className="mobile-field-label">Time In</span>
                            <input
                              type="time"
                              value={row.timeIn}
                              onChange={(e) => handleRowChange(row.id, 'timeIn', e.target.value)}
                              className="input"
                            />
                          </label>
                          <label className="mobile-field" style={{ flex: 1 }}>
                            <span className="mobile-field-label">Time Out</span>
                            <input
                              type="time"
                              value={row.timeOut}
                              onChange={(e) => handleRowChange(row.id, 'timeOut', e.target.value)}
                              className="input"
                            />
                          </label>
                        </div>
                        {duration && (
                          <div className="mobile-card-duration">{duration}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-small"
                        onClick={() => setExpandedRowId(null)}
                        style={{ width: '100%', marginTop: '8px', background: 'var(--color-bg-input)' }}
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <div
                      className="mobile-card-collapsed"
                      onClick={() => setExpandedRowId(row.id)}
                    >
                      <span className="mobile-card-date">{formatDateDisplay(row.date)}</span>
                      <span className="mobile-card-summary">
                        {row.timeIn && row.timeOut ? (
                          <>
                            {formatTime(row.timeIn)} - {formatTime(row.timeOut)}
                            {duration && <span className="mobile-card-dur"> ({duration})</span>}
                          </>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>Tap to fill in</span>
                        )}
                      </span>
                      <button
                        type="button"
                        className="btn-remove-row"
                        onClick={(e) => { e.stopPropagation(); handleRemoveRow(row.id); }}
                      >
                        X
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {spreadsheetRows.length > 0 && (
          <div className="spreadsheet-actions">
            <button
              type="button"
              className="btn"
              onClick={handleClearAll}
              disabled={loading}
            >
              Clear All
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveAll}
              disabled={loading || spreadsheetRows.every(row => !validateRow(row))}
            >
              {loading ? 'Saving...' : `Save All (${spreadsheetRows.filter(validateRow).length})`}
            </button>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </div>
    );
  };

  const renderSpreadsheet = () => {
    return (
      <div className="spreadsheet-section">
        <div className="spreadsheet-header">
          <h2>Add Hours</h2>
          <p className="spreadsheet-hint">Click dates on the calendar to add rows</p>
        </div>

        {spreadsheetRows.length === 0 ? (
          <div className="spreadsheet-empty">
            <p>No dates selected. Click on calendar dates to add entries.</p>
          </div>
        ) : (
          <div className="spreadsheet-wrapper">
            <table className="hours-spreadsheet">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Activity</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {spreadsheetRows.map(row => {
                  const isValid = validateRow(row);

                  return (
                    <tr key={row.id} className={!isValid && (row.timeIn || row.timeOut) ? 'invalid-row' : ''}>
                      <td className="date-cell">
                        {formatDateDisplay(row.date)}
                      </td>
                      <td>
                        <select
                          value={row.type}
                          onChange={(e) => handleRowChange(row.id, 'type', e.target.value)}
                          className="spreadsheet-select"
                        >
                          {HOUR_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.item}
                          onChange={(e) => handleRowChange(row.id, 'item', e.target.value)}
                          placeholder="Activity..."
                          className="spreadsheet-input"
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          value={row.timeIn}
                          onChange={(e) => handleRowChange(row.id, 'timeIn', e.target.value)}
                          className="spreadsheet-input time-input"
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          value={row.timeOut}
                          onChange={(e) => handleRowChange(row.id, 'timeOut', e.target.value)}
                          className="spreadsheet-input time-input"
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-remove-row"
                          onClick={() => handleRemoveRow(row.id)}
                          title="Remove row"
                        >
                          X
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {spreadsheetRows.length > 0 && (
          <div className="spreadsheet-actions">
            <button
              type="button"
              className="btn"
              onClick={handleClearAll}
              disabled={loading}
            >
              Clear All
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveAll}
              disabled={loading || spreadsheetRows.every(row => !validateRow(row))}
            >
              {loading ? 'Saving...' : `Save All Hours (${spreadsheetRows.filter(validateRow).length})`}
            </button>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </div>
    );
  };

  return (
    <div>
      <Navbar />
      <div className="container">
        <h1 className="page-title">Log Hours</h1>

        <div className="log-hours-layout-v2">
          {/* Left: Calendar */}
          <div className="calendar-panel">
            <div className="card">
              {renderCalendar()}
              <div className="calendar-legend">
                <span><span className="legend-dot today"></span> Today</span>
                <span><span className="legend-dot has-hours"></span> Has Hours</span>
                <span><span className="legend-dot in-spreadsheet"></span> Selected</span>
              </div>
              {renderExpandedHours()}
            </div>
          </div>

          {/* Right: Spreadsheet (desktop table / mobile cards) */}
          <div className="spreadsheet-panel">
            <div className="card">
              {isMobile ? renderMobileSpreadsheet() : renderSpreadsheet()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LogHours;
