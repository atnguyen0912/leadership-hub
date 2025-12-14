import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useAuth } from '../contexts';

function CashBox() {
  const { user } = useAuth();
  const [cashbox, setCashbox] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Create session form (for concessions leads)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionProgramId, setSessionProgramId] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);

  const isConcessionLead = user.leadType === 'concessions';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const fetchPromises = [fetch('/api/cashbox/sessions/active')];

      // Only fetch cashbox balance for concession leads
      if (isConcessionLead) {
        fetchPromises.push(fetch('/api/cashbox'));
        fetchPromises.push(fetch('/api/cashbox/programs'));
      }

      const responses = await Promise.all(fetchPromises);
      const sessionsData = await responses[0].json();

      if (!responses[0].ok) throw new Error(sessionsData.error);
      setActiveSessions(sessionsData);

      if (isConcessionLead) {
        const cashboxData = await responses[1].json();
        const programsData = await responses[2].json();

        if (!responses[1].ok) throw new Error(cashboxData.error);
        if (!responses[2].ok) throw new Error(programsData.error);

        setCashbox(cashboxData);
        setPrograms(programsData);

        if (programsData.length > 0 && !sessionProgramId) {
          setSessionProgramId(programsData[0].id.toString());
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'created':
        return { class: 'pending', label: 'Needs Starting Cash', action: 'Start Session' };
      case 'active':
        return { class: 'approved', label: 'In Progress', action: 'Close Session' };
      default:
        return { class: '', label: status, action: 'View' };
    }
  };

  const handleSessionClick = (session) => {
    navigate(`/concession-session/${session.id}`);
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!sessionName.trim() || !sessionProgramId) return;

    setError('');
    setSuccess('');
    setCreatingSession(true);

    try {
      const response = await fetch('/api/cashbox/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sessionName.trim(),
          programId: parseInt(sessionProgramId),
          createdBy: user.studentId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create session');
      }

      setSuccess('Session created successfully!');
      setSessionName('');
      setShowCreateForm(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingSession(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container-narrow">
          <p style={{ color: 'var(--color-primary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const createdSessions = activeSessions.filter(s => s.status === 'created');
  const inProgressSessions = activeSessions.filter(s => s.status === 'active');

  return (
    <div>
      <Navbar />
      <div className="container-narrow">
        <h1 className="page-title">Concessions</h1>

        {error && <div className="card"><div className="error-message">{error}</div></div>}
        {success && <div className="card"><div className="success-message">{success}</div></div>}

        {/* Concession Lead: View Main Cashbox Balance */}
        {isConcessionLead && cashbox && (
          <div className="card">
            <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>💰</span>
              Main CashBox Balance
            </h2>
            <div className="cashbox-totals">
              <div className="denomination-card">
                <div className="label">Quarters</div>
                <div className="count">{cashbox.quarters}</div>
                <div className="value">{formatCurrency(cashbox.quarters * 0.25)}</div>
              </div>
              <div className="denomination-card">
                <div className="label">$1 Bills</div>
                <div className="count">{cashbox.bills_1}</div>
                <div className="value">{formatCurrency(cashbox.bills_1)}</div>
              </div>
              <div className="denomination-card">
                <div className="label">$5 Bills</div>
                <div className="count">{cashbox.bills_5}</div>
                <div className="value">{formatCurrency(cashbox.bills_5 * 5)}</div>
              </div>
              <div className="denomination-card">
                <div className="label">$10 Bills</div>
                <div className="count">{cashbox.bills_10}</div>
                <div className="value">{formatCurrency(cashbox.bills_10 * 10)}</div>
              </div>
              <div className="denomination-card">
                <div className="label">$20 Bills</div>
                <div className="count">{cashbox.bills_20}</div>
                <div className="value">{formatCurrency(cashbox.bills_20 * 20)}</div>
              </div>
              <div className="denomination-card">
                <div className="label">$50 Bills</div>
                <div className="count">{cashbox.bills_50}</div>
                <div className="value">{formatCurrency(cashbox.bills_50 * 50)}</div>
              </div>
              <div className="denomination-card">
                <div className="label">$100 Bills</div>
                <div className="count">{cashbox.bills_100}</div>
                <div className="value">{formatCurrency(cashbox.bills_100 * 100)}</div>
              </div>
            </div>
            <div className="cashbox-total">
              Total: {formatCurrency(cashbox.totalValue)}
            </div>
          </div>
        )}

        {/* Concession Lead: Create Session */}
        {isConcessionLead && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showCreateForm ? '16px' : 0 }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-primary)' }}>Create Session</h2>
              <button
                className="btn btn-small"
                onClick={() => setShowCreateForm(!showCreateForm)}
                style={{ background: showCreateForm ? 'var(--color-border)' : 'var(--color-primary)' }}
              >
                {showCreateForm ? 'Cancel' : '+ New Session'}
              </button>
            </div>

            {showCreateForm && (
              <form onSubmit={handleCreateSession}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: '2', minWidth: '200px', marginBottom: 0 }}>
                    <label htmlFor="sessionName">Session Name</label>
                    <input
                      type="text"
                      id="sessionName"
                      className="input"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="e.g., Girls Basketball 12/11"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}>
                    <label htmlFor="sessionProgram">Program</label>
                    <select
                      id="sessionProgram"
                      className="input"
                      value={sessionProgramId}
                      onChange={(e) => setSessionProgramId(e.target.value)}
                      required
                    >
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={creatingSession}
                  >
                    {creatingSession ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Sessions */}
        {activeSessions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📦</div>
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '8px' }}>No Active Sessions</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>
              There are no concession sessions available right now.
            </p>
            {!isConcessionLead && (
              <p style={{ color: 'var(--color-text-subtle)', fontSize: '14px', marginTop: '8px' }}>
                A concessions lead or admin needs to create a session.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Sessions Needing Start */}
            {createdSessions.length > 0 && (
              <div className="card">
                <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>⏳</span>
                  Ready to Start
                </h2>
                <p style={{ color: 'var(--color-text-subtle)', fontSize: '14px', marginBottom: '16px' }}>
                  These sessions need starting cash counted before they can begin.
                </p>
                <div className="sessions-list">
                  {createdSessions.map((session) => {
                    const statusInfo = getStatusInfo(session.status);
                    return (
                      <div
                        key={session.id}
                        className="session-card"
                        onClick={() => handleSessionClick(session)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <strong style={{ color: 'var(--color-primary)', fontSize: '18px' }}>{session.name}</strong>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>{session.program_name}</div>
                          </div>
                          <span className={`status-badge ${statusInfo.class}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div style={{ color: 'var(--color-text-subtle)', fontSize: '13px' }}>
                          Created: {formatDateTime(session.created_at)}
                        </div>
                        <div style={{
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: '1px solid rgba(34, 197, 94, 0.2)',
                          display: 'flex',
                          justifyContent: 'flex-end'
                        }}>
                          <span style={{
                            color: 'var(--color-primary)',
                            fontSize: '14px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {statusInfo.action} →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Sessions */}
            {inProgressSessions.length > 0 && (
              <div className="card">
                <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>✓</span>
                  Active Sessions
                </h2>
                <p style={{ color: 'var(--color-text-subtle)', fontSize: '14px', marginBottom: '16px' }}>
                  These sessions are running. Use the counter to ring up orders, or close when done.
                </p>
                <div className="sessions-list">
                  {inProgressSessions.map((session) => {
                    const statusInfo = getStatusInfo(session.status);
                    return (
                      <div
                        key={session.id}
                        className="session-card"
                        onClick={() => handleSessionClick(session)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <strong style={{ color: 'var(--color-primary)', fontSize: '18px' }}>{session.name}</strong>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>{session.program_name}</div>
                          </div>
                          <span className={`status-badge ${statusInfo.class}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          gap: '16px',
                          color: 'var(--color-text-muted)',
                          fontSize: '14px',
                          flexWrap: 'wrap'
                        }}>
                          <span>Started with: <strong>{formatCurrency(session.start_total)}</strong></span>
                          <span style={{ color: 'var(--color-text-subtle)' }}>{formatDateTime(session.started_at)}</span>
                        </div>
                        <div style={{
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: '1px solid rgba(34, 197, 94, 0.2)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          flexWrap: 'wrap'
                        }}>
                          <button
                            className="btn btn-primary btn-small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/concession-session/${session.id}?counter=true`);
                            }}
                          >
                            Open Counter
                          </button>
                          <span style={{
                            color: 'var(--color-primary)',
                            fontSize: '14px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {statusInfo.action} →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CashBox;
