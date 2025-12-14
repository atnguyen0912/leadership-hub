import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';

function EventsAdmin() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all');

  // Add attendee
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setEvents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventDetails = async (eventId) => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setSelectedEvent(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAction = async (eventId, action) => {
    setError('');
    setSuccess('');
    setActionLoading(`${eventId}-${action}`);

    try {
      const response = await fetch(`/api/events/${eventId}/${action}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      const messages = {
        approve: `Event approved! Check-in code: ${data.checkInCode}`,
        activate: 'Event activated! Students can now check in.',
        complete: `Event completed! Hours logged for ${data.hoursLoggedFor} attendees.`,
        cancel: 'Event cancelled.'
      };

      setSuccess(messages[action] || 'Action completed!');
      fetchEvents();
      if (selectedEvent && selectedEvent.id === eventId) {
        fetchEventDetails(eventId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const searchStudents = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/students/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setSearchResults(data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddAttendee = async (studentId) => {
    if (!selectedEvent) return;

    setError('');
    try {
      const response = await fetch(`/api/events/${selectedEvent.id}/attendees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setSuccess(data.added ? 'Student added to event!' : 'Student was already attending.');
      setSearchQuery('');
      setSearchResults([]);
      fetchEventDetails(selectedEvent.id);
      fetchEvents();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveAttendee = async (studentId) => {
    if (!selectedEvent) return;

    try {
      const response = await fetch(`/api/events/${selectedEvent.id}/attendees/${studentId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setSuccess('Attendee removed.');
      fetchEventDetails(selectedEvent.id);
      fetchEvents();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: { bg: '#eab308', text: '#000' },
      approved: { bg: '#3b82f6', text: '#fff' },
      active: { bg: '#22c55e', text: '#fff' },
      completed: { bg: '#6b7280', text: '#fff' },
      cancelled: { bg: '#ef4444', text: '#fff' }
    };
    const color = colors[status] || colors.pending;
    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 500,
        background: color.bg,
        color: color.text,
        textTransform: 'capitalize'
      }}>
        {status}
      </span>
    );
  };

  const filteredEvents = statusFilter === 'all'
    ? events
    : events.filter(e => e.status === statusFilter);

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container">
        <h1 className="page-title">Events Management</h1>

        {error && <div className="card"><div className="error-message">{error}</div></div>}
        {success && <div className="card"><div className="success-message">{success}</div></div>}

        <div style={{ display: 'grid', gridTemplateColumns: selectedEvent ? '1fr 1fr' : '1fr', gap: '20px' }}>
          {/* Events List */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-primary)' }}>All Events</h2>
              <select
                className="input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '120px' }}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {filteredEvents.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>No events found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={() => fetchEventDetails(event.id)}
                    style={{
                      padding: '12px',
                      background: selectedEvent?.id === event.id ? 'rgba(34, 197, 94, 0.1)' : 'var(--color-bg-input)',
                      borderRadius: '6px',
                      border: selectedEvent?.id === event.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ color: 'var(--color-text)', fontWeight: 500 }}>{event.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>
                          {event.start_date} | by {event.creator_name || 'Unknown'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        {getStatusBadge(event.status)}
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{event.attendee_count} attendees</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      {event.status === 'pending' && (
                        <>
                          <button
                            className="btn btn-small btn-primary"
                            onClick={(e) => { e.stopPropagation(); handleAction(event.id, 'approve'); }}
                            disabled={actionLoading === `${event.id}-approve`}
                          >
                            {actionLoading === `${event.id}-approve` ? '...' : 'Approve'}
                          </button>
                          <button
                            className="btn btn-small btn-danger"
                            onClick={(e) => { e.stopPropagation(); handleAction(event.id, 'cancel'); }}
                            disabled={actionLoading === `${event.id}-cancel`}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {event.status === 'approved' && (
                        <button
                          className="btn btn-small"
                          style={{ background: 'var(--color-info)' }}
                          onClick={(e) => { e.stopPropagation(); handleAction(event.id, 'activate'); }}
                          disabled={actionLoading === `${event.id}-activate`}
                        >
                          {actionLoading === `${event.id}-activate` ? '...' : 'Activate Check-in'}
                        </button>
                      )}
                      {event.status === 'active' && (
                        <button
                          className="btn btn-small"
                          style={{ background: 'var(--color-primary)' }}
                          onClick={(e) => { e.stopPropagation(); handleAction(event.id, 'complete'); }}
                          disabled={actionLoading === `${event.id}-complete`}
                        >
                          {actionLoading === `${event.id}-complete` ? '...' : 'Complete & Log Hours'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event Details */}
          {selectedEvent && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-primary)' }}>{selectedEvent.name}</h2>
                <button
                  className="btn btn-small"
                  onClick={() => setSelectedEvent(null)}
                  style={{ background: 'var(--color-border)' }}
                >
                  Close
                </button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                {getStatusBadge(selectedEvent.status)}
                {selectedEvent.check_in_code && (
                  <span style={{
                    marginLeft: '12px',
                    padding: '4px 12px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '6px',
                    color: 'var(--color-primary)',
                    fontWeight: 700,
                    letterSpacing: '2px'
                  }}>
                    {selectedEvent.check_in_code}
                  </span>
                )}
              </div>

              {selectedEvent.description && (
                <p style={{ color: 'var(--color-text-subtle)', marginBottom: '12px' }}>{selectedEvent.description}</p>
              )}

              <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                <div><strong>Dates:</strong> {selectedEvent.start_date} to {selectedEvent.end_date}</div>
                <div><strong>Hours:</strong> {selectedEvent.default_time_in} - {selectedEvent.default_time_out}</div>
                <div><strong>Created by:</strong> {selectedEvent.creator_name}</div>
              </div>

              {/* Add Attendee */}
              {(selectedEvent.status === 'approved' || selectedEvent.status === 'active') && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                    Add Attendee
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchStudents(e.target.value);
                    }}
                    placeholder="Search by name or ID..."
                  />
                  {searchResults.length > 0 && (
                    <div style={{
                      marginTop: '4px',
                      background: 'var(--color-bg-input)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      maxHeight: '150px',
                      overflowY: 'auto'
                    }}>
                      {searchResults.map(student => (
                        <div
                          key={student.student_id}
                          onClick={() => handleAddAttendee(student.student_id)}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--color-border)',
                            color: 'var(--color-text)'
                          }}
                        >
                          {student.name} <span style={{ color: 'var(--color-text-subtle)' }}>({student.student_id})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Attendees List */}
              <div>
                <h3 style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                  Attendees ({selectedEvent.attendees?.length || 0})
                </h3>
                {(!selectedEvent.attendees || selectedEvent.attendees.length === 0) ? (
                  <p style={{ color: 'var(--color-text-subtle)', fontSize: '14px', textAlign: 'center' }}>No attendees yet.</p>
                ) : (
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {selectedEvent.attendees.map(attendee => (
                      <div
                        key={attendee.student_id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px',
                          background: 'var(--color-bg-input)',
                          borderRadius: '4px',
                          marginBottom: '4px'
                        }}
                      >
                        <div>
                          <span style={{ color: 'var(--color-text)' }}>{attendee.student_name}</span>
                          {attendee.hours_logged ? (
                            <span style={{ marginLeft: '8px', color: 'var(--color-primary)', fontSize: '12px' }}>Hours logged</span>
                          ) : attendee.checked_in ? (
                            <span style={{ marginLeft: '8px', color: 'var(--color-info)', fontSize: '12px' }}>Checked in</span>
                          ) : null}
                        </div>
                        {!attendee.hours_logged && (
                          <button
                            className="btn btn-small btn-danger"
                            style={{ padding: '2px 8px', fontSize: '12px' }}
                            onClick={() => handleRemoveAttendee(attendee.student_id)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventsAdmin;
