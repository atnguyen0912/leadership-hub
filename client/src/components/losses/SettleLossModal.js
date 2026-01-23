import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../contexts';

function SettleLossModal({ isOpen, onClose, loss, onLossSettled }) {
  const { user } = useAuth();
  const [settleTo, setSettleTo] = useState('asb');
  const [notes, setNotes] = useState('');
  const [programs, setPrograms] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch programs when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPrograms();
      setSettleTo('asb'); // Reset to default
      setNotes('');
      setError('');
    }
  }, [isOpen]);

  const fetchPrograms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/cashbox/programs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPrograms(data);
      }
    } catch (err) {
      console.error('Failed to fetch programs:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/losses/${loss.id}/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          settleTo,
          settledBy: user?.username || 'Unknown',
          notes: notes.trim() || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to settle loss');
      }

      // Success
      if (onLossSettled) {
        onLossSettled();
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !loss) return null;

  // Format loss type for display
  const formatLossType = (type) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--color-bg-primary)',
        borderRadius: '8px',
        padding: '24px',
        width: '100%',
        maxWidth: '550px',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid var(--color-border)'
      }}>
        <h3 style={{ color: '#f59e0b', marginBottom: '20px' }}>
          Settle Loss
        </h3>

        {/* Loss Details */}
        <div style={{
          background: 'var(--color-bg-input)',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid var(--color-border)'
        }}>
          <h4 style={{
            color: 'var(--color-primary)',
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Loss Details
          </h4>
          <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-subtle)' }}>Type:</span>
              <span style={{ color: 'var(--color-text-muted)', fontWeight: '500' }}>
                {formatLossType(loss.loss_type)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-subtle)' }}>Amount:</span>
              <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '16px' }}>
                {formatCurrency(loss.amount)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--color-text-subtle)' }}>From:</span>
              <span style={{ color: 'var(--color-text-muted)', fontWeight: '500' }}>
                {loss.session_name || 'General'}
              </span>
            </div>
            {loss.description && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>Description:</span>
                <div style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  {loss.description}
                </div>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Settlement Options */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{
              fontSize: '14px',
              marginBottom: '12px',
              fontWeight: '600',
              display: 'block',
              color: 'var(--color-primary)'
            }}>
              Assign loss to:
            </label>

            {/* ASB Option */}
            <div style={{
              marginBottom: '10px',
              padding: '12px',
              background: settleTo === 'asb' ? 'var(--color-bg-input)' : 'transparent',
              borderRadius: '6px',
              border: `1px solid ${settleTo === 'asb' ? 'var(--color-primary)' : 'var(--color-border)'}`,
              cursor: 'pointer'
            }}
            onClick={() => setSettleTo('asb')}
            >
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="settleTo"
                  value="asb"
                  checked={settleTo === 'asb'}
                  onChange={(e) => setSettleTo(e.target.value)}
                  style={{ marginRight: '10px' }}
                />
                <div>
                  <div style={{ fontWeight: '500', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                    ASB (Absorb as Operational Loss)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
                    Loss is absorbed by ASB with no balance changes
                  </div>
                </div>
              </label>
            </div>

            {/* Program Options */}
            {programs.map(program => (
              <div
                key={program.id}
                style={{
                  marginBottom: '10px',
                  padding: '12px',
                  background: settleTo === `program:${program.id}` ? 'var(--color-bg-input)' : 'transparent',
                  borderRadius: '6px',
                  border: `1px solid ${settleTo === `program:${program.id}` ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  cursor: 'pointer'
                }}
                onClick={() => setSettleTo(`program:${program.id}`)}
              >
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="settleTo"
                    value={`program:${program.id}`}
                    checked={settleTo === `program:${program.id}`}
                    onChange={(e) => setSettleTo(e.target.value)}
                    style={{ marginRight: '10px' }}
                  />
                  <div>
                    <div style={{ fontWeight: '500', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                      {program.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
                      Deduct from program balance (Current: {formatCurrency(program.balance || 0)})
                    </div>
                  </div>
                </label>
              </div>
            ))}

            {/* Reimbursement Option */}
            <div style={{
              marginBottom: '10px',
              padding: '12px',
              background: settleTo === 'reimbursement' ? 'var(--color-bg-input)' : 'transparent',
              borderRadius: '6px',
              border: `1px solid ${settleTo === 'reimbursement' ? 'var(--color-primary)' : 'var(--color-border)'}`,
              cursor: 'pointer'
            }}
            onClick={() => setSettleTo('reimbursement')}
            >
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="settleTo"
                  value="reimbursement"
                  checked={settleTo === 'reimbursement'}
                  onChange={(e) => setSettleTo(e.target.value)}
                  style={{ marginRight: '10px' }}
                />
                <div>
                  <div style={{ fontWeight: '500', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                    Alex (Reduce Reimbursement Owed)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
                    Offset against COGS reimbursement owed to Alex
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', marginBottom: '6px', fontWeight: '500', display: 'block' }}>
              Notes (Optional)
            </label>
            <textarea
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this settlement..."
              rows="3"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message" style={{ marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn"
              onClick={onClose}
              disabled={submitting}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ flex: 1, background: '#f59e0b' }}
            >
              {submitting ? 'Settling...' : 'Settle Loss'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SettleLossModal;
