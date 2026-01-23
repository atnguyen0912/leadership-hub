import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../contexts';

function RecordLossModal({ isOpen, onClose, onLossRecorded, prefillData = null }) {
  const { user } = useAuth();
  const [lossType, setLossType] = useState('');
  const [amount, setAmount] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [description, setDescription] = useState('');
  const [sessions, setSessions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Prefill data if provided
  useEffect(() => {
    if (prefillData) {
      if (prefillData.lossType) setLossType(prefillData.lossType);
      if (prefillData.amount) setAmount(Math.abs(prefillData.amount).toFixed(2));
      if (prefillData.sessionId) setSessionId(prefillData.sessionId);
      if (prefillData.description) setDescription(prefillData.description);
    }
  }, [prefillData]);

  // Fetch recent sessions when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/cashbox/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Get recent active or closed sessions (last 30 days)
        const recentSessions = data.filter(s => {
          const sessionDate = new Date(s.start_time || s.created_at);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return sessionDate >= thirtyDaysAgo;
        });
        setSessions(recentSessions);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!lossType) {
      setError('Please select a loss type');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/losses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lossType,
          amount: parseFloat(amount),
          sessionId: sessionId || null,
          description: description.trim() || null,
          createdBy: user?.username || 'Unknown'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record loss');
      }

      // Success - reset form and notify parent
      setLossType('');
      setAmount('');
      setSessionId(null);
      setDescription('');

      if (onLossRecorded) {
        onLossRecorded();
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const lossTypes = [
    { value: 'cash_shortage', label: 'Cash Shortage' },
    { value: 'cash_overage', label: 'Cash Overage' },
    { value: 'cash_discrepancy', label: 'Cash Discrepancy' },
    { value: 'inventory_discrepancy', label: 'Inventory Discrepancy' },
    { value: 'spoilage', label: 'Spoilage' },
    { value: 'damaged_goods', label: 'Damaged Goods' },
    { value: 'theft', label: 'Theft' },
    { value: 'other', label: 'Other' }
  ];

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
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid var(--color-border)'
      }}>
        <h3 style={{ color: '#ef4444', marginBottom: '20px' }}>
          Record Loss
        </h3>

        <form onSubmit={handleSubmit}>
          {/* Loss Type */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', marginBottom: '6px', fontWeight: '500', display: 'block' }}>
              Loss Type *
            </label>
            <select
              className="input"
              value={lossType}
              onChange={(e) => setLossType(e.target.value)}
              required
              style={{ width: '100%' }}
            >
              <option value="">Select loss type...</option>
              {lossTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', marginBottom: '6px', fontWeight: '500', display: 'block' }}>
              Amount *
            </label>
            <input
              type="number"
              className="input"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              style={{ width: '100%', fontSize: '18px', textAlign: 'center', fontWeight: '600' }}
            />
          </div>

          {/* Session (Optional) */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', marginBottom: '6px', fontWeight: '500', display: 'block' }}>
              Related Session (Optional)
            </label>
            <select
              className="input"
              value={sessionId || ''}
              onChange={(e) => setSessionId(e.target.value ? parseInt(e.target.value) : null)}
              style={{ width: '100%' }}
            >
              <option value="">(None - general loss)</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.name} - {new Date(session.start_time || session.created_at).toLocaleDateString()}
                  {session.status === 'active' && ' (Active)'}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', marginBottom: '6px', fontWeight: '500', display: 'block' }}>
              Description
            </label>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this loss..."
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
              style={{ flex: 1, background: '#ef4444' }}
            >
              {submitting ? 'Recording...' : 'Record Loss'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RecordLossModal;
