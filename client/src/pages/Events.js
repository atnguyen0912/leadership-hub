import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';

function Events({ user, onLogout }) {
  const [activeEvents, setActiveEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Join by code
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Create event (for leads)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    defaultTimeIn: '08:00',
    defaultTimeOut: '16:00'
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const [activeRes, myRes] = await Promise.all([
        fetch('/api/events/active'),
        fetch(`/api/events?createdBy=${user.studentId}`)
      ]);

      const activeData = await activeRes.json();
      const myData = await myRes.json();

      if (!activeRes.ok) throw new Error(activeData.error);
      if (!myRes.ok) throw new Error(myData.error);

      setActiveEvents(activeData);
      setMyEvents(myData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setJoining(true);

    try {
      const response = await fetch('/api/events/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: joinCode.toUpperCase(),
          studentId: user.studentId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join event');
      }

      if (data.alreadyJoined) {
        setSuccess(`You're already checked in to "${data.event.name}"!`);
      } else {
        setSuccess(`Successfully joined "${data.event.name}"!`);
      }
      setJoinCode('');
      fetchEvents();
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description,
          startDate: createForm.startDate,
          endDate: createForm.endDate,
          defaultTimeIn: createForm.defaultTimeIn,
          defaultTimeOut: createForm.defaultTimeOut,
          createdBy: user.studentId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create event');
      }

      setSuccess('Event created! Waiting for admin approval.');
      setShowCreateForm(false);
      setCreateForm({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        defaultTimeIn: '08:00',
        defaultTimeOut: '16:00'
      });
      fetchEvents();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
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
        padding: '2px 8px',
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
        <h1 className="page-title">Events</h1>

        {error && <div className="card"><div className="error-message">{error}</div></div>}
        {success && <div className="card"><div className="success-message">{success}</div></div>}

        {/* Join Event by Code */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>Join Event</h2>
          <form onSubmit={handleJoinByCode}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label htmlFor="code">Enter Check-in Code</label>
                <input
                  type="text"
                  id="code"
                  className="input"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g., ABC123"
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={joining || joinCode.length < 4}>
                {joining ? 'Joining...' : 'Join'}
              </button>
            </div>
          </form>
        </div>

        {/* Active Events */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>Active Events</h2>
          {activeEvents.length === 0 ? (
            <p style={{ color: '#4ade80', textAlign: 'center' }}>No active events at this time.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeEvents.map(event => (
                <div key={event.id} style={{
                  padding: '16px',
                  background: '#1a1a1a',
                  borderRadius: '8px',
                  border: '1px solid #333'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: '#fff' }}>{event.name}</h3>
                    {getStatusBadge(event.status)}
                  </div>
                  {event.description && (
                    <p style={{ margin: '8px 0', color: '#888', fontSize: '14px' }}>{event.description}</p>
                  )}
                  <div style={{ fontSize: '14px', color: '#4ade80' }}>
                    <span>{event.start_date} - {event.end_date}</span>
                    <span style={{ margin: '0 12px', color: '#444' }}>|</span>
                    <span>{event.default_time_in} - {event.default_time_out}</span>
                    <span style={{ margin: '0 12px', color: '#444' }}>|</span>
                    <span>{event.attendee_count} attendees</span>
                  </div>
                  {event.status === 'active' && event.check_in_code && (
                    <div style={{ marginTop: '12px', padding: '8px 12px', background: '#22c55e20', borderRadius: '6px', display: 'inline-block' }}>
                      <span style={{ color: '#4ade80', fontSize: '12px' }}>Check-in Code: </span>
                      <span style={{ color: '#22c55e', fontWeight: 700, letterSpacing: '2px' }}>{event.check_in_code}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Event (Events Leads Only) */}
        {user.leadType === 'events' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#22c55e' }}>Create Event</h2>
              <button
                className="btn btn-small"
                onClick={() => setShowCreateForm(!showCreateForm)}
                style={{ background: showCreateForm ? '#333' : '#22c55e' }}
              >
                {showCreateForm ? 'Cancel' : '+ New Event'}
              </button>
            </div>

            {showCreateForm && (
              <form onSubmit={handleCreateEvent}>
                <div className="form-group">
                  <label htmlFor="eventName">Event Name</label>
                  <input
                    type="text"
                    id="eventName"
                    className="input"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g., Fall Leadership Conference"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="eventDesc">Description (optional)</label>
                  <textarea
                    id="eventDesc"
                    className="input"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Brief description of the event..."
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="startDate">Start Date</label>
                    <input
                      type="date"
                      id="startDate"
                      className="input"
                      value={createForm.startDate}
                      onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="endDate">End Date</label>
                    <input
                      type="date"
                      id="endDate"
                      className="input"
                      value={createForm.endDate}
                      onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="timeIn">Default Time In</label>
                    <input
                      type="time"
                      id="timeIn"
                      className="input"
                      value={createForm.defaultTimeIn}
                      onChange={(e) => setCreateForm({ ...createForm, defaultTimeIn: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="timeOut">Default Time Out</label>
                    <input
                      type="time"
                      id="timeOut"
                      className="input"
                      value={createForm.defaultTimeOut}
                      onChange={(e) => setCreateForm({ ...createForm, defaultTimeOut: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={creating} style={{ width: '100%' }}>
                  {creating ? 'Creating...' : 'Submit for Approval'}
                </button>
              </form>
            )}

            {/* My Created Events */}
            {myEvents.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '16px', color: '#4ade80', marginBottom: '12px' }}>My Created Events</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {myEvents.map(event => (
                    <div key={event.id} style={{
                      padding: '12px',
                      background: '#1a1a1a',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <span style={{ color: '#fff' }}>{event.name}</span>
                        <span style={{ marginLeft: '12px', color: '#888', fontSize: '14px' }}>
                          {event.start_date}
                        </span>
                      </div>
                      {getStatusBadge(event.status)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Events;
