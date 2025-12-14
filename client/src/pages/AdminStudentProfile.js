import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { formatDateWithWeekday, formatTime, calculateMinutes, formatMinutes, calculateHours } from '../utils/formatters';
import { HOUR_TYPES, getHourTypeLabel, getHourTypeColor } from '../utils/hourTypes';

// Helper to get date string in local timezone (YYYY-MM-DD format)
const getLocalDateString = (date = new Date()) => {
  return date.toLocaleDateString('en-CA');
};

function AdminStudentProfile({ user, onLogout }) {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

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

  const renderSelectedDateEntries = () => {
    if (!selectedDate) return null;

    const entries = getHoursForDate(selectedDate);
    if (entries.length === 0) {
      return (
        <div className="card" style={{ marginTop: '16px' }}>
          <p style={{ color: '#6b7280', textAlign: 'center' }}>No hours logged on this day</p>
        </div>
      );
    }

    return (
      <div className="card" style={{ marginTop: '16px' }}>
        <h3 style={{ color: '#22c55e', marginBottom: '12px' }}>
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
              <span style={{ color: '#22c55e', fontWeight: 'bold' }}>
                {calculateHours(entry.time_in, entry.time_out)}
              </span>
            </div>
            <div style={{ color: '#9ca3af' }}>
              {formatTime(entry.time_in)} - {formatTime(entry.time_out)}
            </div>
            {entry.item && (
              <div style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
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
                      <th>Type</th>
                      <th>Time In</th>
                      <th>Time Out</th>
                      <th>Hours</th>
                      <th>Activity</th>
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
                        <td style={{ color: '#9ca3af' }}>{entry.item || '-'}</td>
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
        <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>Hours by Type</h3>
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
                  <span style={{ color: '#9ca3af' }}>{formatMinutes(minutes)}</span>
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
        <Navbar user={user} onLogout={onLogout} />
        <div className="container">
          <p style={{ color: '#22c55e' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Navbar user={user} onLogout={onLogout} />
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
      <Navbar user={user} onLogout={onLogout} />
      <div className="container">
        <button
          className="btn"
          onClick={() => navigate('/admin/hours')}
          style={{ marginBottom: '16px' }}
        >
          &larr; Back to Hours
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <h1 className="page-title" style={{ margin: 0 }}>{student?.name}</h1>
          <div style={{ color: '#22c55e', fontSize: '24px', fontWeight: 'bold' }}>
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
