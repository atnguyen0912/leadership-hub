import React, { useState, useEffect } from 'react';

function ArchiveSection() {
  const [backups, setBackups] = useState([]);
  const [cutoffDate, setCutoffDate] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/admin/backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(data);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const canArchive = confirmText === 'ARCHIVE AND RESET' && cutoffDate && !archiving;

  const handleArchive = async () => {
    if (!canArchive) return;

    setArchiving(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/admin/archive-year', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmPhrase: 'ARCHIVE AND RESET', cutoffDate })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Archive failed');
      }

      setResult(data);
      setConfirmText('');
      setCutoffDate('');
      fetchBackups();
    } catch (err) {
      setError(err.message);
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div>
      <h2 style={{ color: 'var(--color-primary)', marginBottom: '16px' }}>Year Archive</h2>

      {/* Existing Backups */}
      <div style={{
        background: 'var(--color-bg-input)',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--color-text)' }}>
          Available Backups
        </h3>
        {backups.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 }}>
            No backups found. Archiving will create your first backup.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {backups.map((backup) => (
              <div key={backup.filename} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                background: 'var(--color-bg)',
                borderRadius: '6px',
                border: '1px solid var(--color-border)'
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
                    {backup.filename}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {backup.sizeFormatted} &middot; {new Date(backup.created).toLocaleString()}
                  </div>
                </div>
                <a
                  href={`/api/admin/backups/${backup.filename}`}
                  download
                  className="btn btn-small"
                  style={{
                    fontSize: '12px',
                    padding: '4px 12px',
                    textDecoration: 'none',
                    background: 'var(--color-primary)',
                    color: 'white'
                  }}
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Archive Action */}
      <div style={{
        background: 'var(--color-bg-input)',
        borderRadius: '8px',
        padding: '16px',
        border: '2px solid #ef4444'
      }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#ef4444' }}>
          Archive & Reset
        </h3>
        <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px', margin: '0 0 12px 0' }}>
          This will create a full backup of the database, then clear all transactional data
          <strong> before the cutoff date</strong> you specify. Data on or after that date is kept.
          Menu items, programs, students, and settings are always preserved.
        </p>

        <div style={{
          background: 'var(--color-bg)',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '12px',
          fontSize: '13px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--color-text)' }}>
            What will be cleared (before cutoff date):
          </div>
          <div style={{ color: 'var(--color-text-subtle)', lineHeight: '1.8' }}>
            <div>&#x2022; Orders and session history</div>
            <div>&#x2022; Purchase records</div>
            <div>&#x2022; Inventory lots, transactions, and counts</div>
            <div>&#x2022; CashApp and Zelle payment records</div>
            <div>&#x2022; Reimbursement ledger and losses</div>
            <div>&#x2022; Profit distributions and program earnings</div>
            <div>&#x2022; Student hours</div>
          </div>
          <div style={{ fontWeight: '600', marginTop: '12px', marginBottom: '8px', color: 'var(--color-text)' }}>
            What is always kept:
          </div>
          <div style={{ color: 'var(--color-text-subtle)', lineHeight: '1.8' }}>
            <div>&#x2022; All data on or after the cutoff date</div>
            <div>&#x2022; Menu items, recipes, and price history</div>
            <div>&#x2022; Programs and their configuration</div>
            <div>&#x2022; Students and admin accounts</div>
            <div>&#x2022; Permission groups and purchase templates</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div style={{ flex: '1', minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--color-text)', marginBottom: '6px' }}>
              Cutoff Date
            </label>
            <input
              type="date"
              className="input"
              value={cutoffDate}
              onChange={(e) => setCutoffDate(e.target.value)}
              style={{ fontSize: '14px', padding: '8px 12px', width: '100%', boxSizing: 'border-box' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Everything <strong>before</strong> this date will be removed
            </div>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-subtle)', marginBottom: '6px' }}>
              Type <strong>ARCHIVE AND RESET</strong> to confirm:
            </label>
            <input
              className="input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ARCHIVE AND RESET"
              style={{ fontSize: '14px', padding: '8px 12px', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <button
          className="btn"
          onClick={handleArchive}
          disabled={!canArchive}
          style={{
            background: canArchive ? '#ef4444' : '#94a3b8',
            color: 'white',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: canArchive ? 'pointer' : 'not-allowed',
            opacity: archiving ? 0.6 : 1
          }}
        >
          {archiving ? 'Archiving...' : cutoffDate ? `Archive data before ${cutoffDate}` : 'Select a cutoff date'}
        </button>

        {error && (
          <div style={{
            marginTop: '12px',
            padding: '10px',
            borderRadius: '6px',
            background: '#fef2f2',
            color: '#dc2626',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            borderRadius: '6px',
            background: '#f0fdf4',
            color: '#16a34a',
            fontSize: '13px'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '6px' }}>
              Archive complete!
            </div>
            <div>Backup saved as: <strong>{result.backupFile}</strong></div>
            <div>All data before <strong>{result.cutoffDate}</strong> has been cleared from {result.tablesCleared.length} tables.</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ArchiveSection;
