import React from 'react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

function SessionHistorySection({
  sessions,
  getStatusBadgeClass,
  onViewSession,
  onDistribute
}) {
  const closedSessions = sessions.filter(s => s.status === 'closed' || s.status === 'cancelled');

  return (
    <div className="card">
      <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-primary)' }}>
        Session History
      </h2>
      {closedSessions.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No closed sessions yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Session</th>
                <th>Program</th>
                <th>Start</th>
                <th>End</th>
                <th>Profit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {closedSessions.map((session) => (
                <tr key={session.id}>
                  <td style={{ fontSize: '13px' }}>{formatDateTime(session.closed_at || session.created_at)}</td>
                  <td>{session.name}</td>
                  <td>{session.program_name}</td>
                  <td>{formatCurrency(session.start_total)}</td>
                  <td>{formatCurrency(session.end_total)}</td>
                  <td style={{
                    color: session.profit >= 0 ? 'var(--color-primary)' : 'var(--color-danger)',
                    fontWeight: 'bold'
                  }}>
                    {formatCurrency(session.profit)}
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(session.status)}`}>
                      {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="btn btn-small"
                        onClick={() => onViewSession(session)}
                        style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--color-info)' }}
                      >
                        View
                      </button>
                      {session.status === 'closed' && session.profit > 0 && (
                        <button
                          className="btn btn-small btn-primary"
                          onClick={() => onDistribute(session)}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          Distribute
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SessionHistorySection;
