import React from 'react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

function ActiveSessionsSection({
  sessions,
  programs,
  sessionName,
  setSessionName,
  sessionProgramId,
  setSessionProgramId,
  isTestSession,
  setIsTestSession,
  creatingSession,
  onCreateSession,
  onViewSession,
  onCancelSession,
  getStatusBadgeClass
}) {
  const activeSessions = sessions.filter(s => s.status === 'created' || s.status === 'active');

  return (
    <div className="card">
      <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-primary)' }}>
        Create New Session
      </h2>
      <form onSubmit={onCreateSession} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-end', paddingBottom: '4px' }}>
            <input
              type="checkbox"
              id="practiceMode"
              checked={isTestSession}
              onChange={(e) => setIsTestSession(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <label htmlFor="practiceMode" style={{ color: isTestSession ? 'var(--color-warning)' : 'var(--color-text-subtle)', cursor: 'pointer', fontSize: '14px' }}>
              Practice Mode
            </label>
          </div>
          <button
            type="submit"
            className={`btn ${isTestSession ? '' : 'btn-primary'}`}
            disabled={creatingSession}
            style={{ alignSelf: 'flex-end', background: isTestSession ? 'var(--color-warning)' : undefined }}
          >
            {creatingSession ? 'Creating...' : isTestSession ? 'Create Practice' : 'Create Session'}
          </button>
        </div>
      </form>

      <h3 style={{ marginBottom: '12px', fontSize: '16px', color: 'var(--color-text-muted)' }}>
        Active Sessions
      </h3>
      {activeSessions.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-subtle)' }}>No active sessions.</p>
      ) : (
        activeSessions.map((session) => (
          <div key={session.id} className="session-card" style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong style={{ color: 'var(--color-primary)' }}>{session.name}</strong>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>{session.program_name}</div>
              </div>
              <span className={`status-badge ${getStatusBadgeClass(session.status)}`}>
                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
              </span>
            </div>
            <div style={{ marginTop: '8px', color: 'var(--color-text-subtle)', fontSize: '14px' }}>
              Created: {formatDateTime(session.created_at)}
              {session.start_total > 0 && (
                <span style={{ marginLeft: '16px' }}>
                  Started: {formatCurrency(session.start_total)}
                </span>
              )}
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-small"
                onClick={() => onViewSession(session.id)}
              >
                View
              </button>
              <button
                className="btn btn-small btn-danger"
                onClick={() => onCancelSession(session.id)}
              >
                Cancel
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default ActiveSessionsSection;
