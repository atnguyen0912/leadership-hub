import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../contexts';

function InventoryCheck() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actualCounts, setActualCounts] = useState({});
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) {
        const data = await res.json();
        // Show only active non-composite items that are tracked
        const trackable = data.filter(i =>
          i.active &&
          i.item_type !== 'composite' &&
          i.is_composite !== 1 &&
          i.track_inventory !== 0
        );
        setItems(trackable);
        // Pre-fill actual counts with estimated (current on-hand)
        const counts = {};
        trackable.forEach(i => { counts[i.id] = String(i.quantity_on_hand || 0); });
        setActualCounts(counts);
      }
    } catch (err) {
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const verifyItems = items.map(item => ({
        menuItemId: item.id,
        actualQuantity: parseInt(actualCounts[item.id]) || 0
      }));

      const res = await fetch('/api/inventory/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationType: 'standalone',
          verifiedBy: user?.name || 'unknown',
          items: verifyItems
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      const discCount = (data.discrepancies || []).length;
      setSuccess(
        discCount > 0
          ? `Inventory verified. ${discCount} item${discCount !== 1 ? 's' : ''} adjusted.`
          : 'Inventory verified. All counts match!'
      );
      fetchInventory();
    } catch (err) {
      setError(err.message || 'Failed to save verification');
    } finally {
      setSubmitting(false);
    }
  };

  const hasChanges = items.some(item => {
    const actual = parseInt(actualCounts[item.id]) || 0;
    return actual !== (item.quantity_on_hand || 0);
  });

  const isBulk = (item) => item.item_type === 'bulk_ingredient' || item.is_supply === 1;

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container">
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '40px' }}>Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container" style={{ maxWidth: '700px' }}>
        <h1 className="page-title">Inventory Check</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '20px' }}>
          Compare the estimated counts with what you actually have. Update any that differ and submit.
        </p>

        {error && <div className="error-message" style={{ marginBottom: '12px' }}>{error}</div>}
        {success && <div className="success-message" style={{ marginBottom: '12px' }}>{success}</div>}

        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Item</th>
                <th style={{ textAlign: 'center', padding: '8px', width: '90px' }}>Estimated</th>
                <th style={{ textAlign: 'center', padding: '8px', width: '100px' }}>Actual</th>
                <th style={{ textAlign: 'center', padding: '8px', width: '70px' }}>Diff</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const actual = parseInt(actualCounts[item.id]) || 0;
                const expected = item.quantity_on_hand || 0;
                const diff = actual - expected;
                const bulk = isBulk(item);

                return (
                  <tr key={item.id} style={{
                    borderBottom: '1px solid var(--color-border)',
                    background: diff !== 0 ? 'rgba(245, 158, 11, 0.08)' : 'transparent'
                  }}>
                    <td style={{ padding: '8px' }}>
                      <span style={{ color: 'var(--color-text)' }}>{item.name}</span>
                      {bulk && item.container_name && (
                        <span style={{ fontSize: '10px', color: '#3b82f6', marginLeft: '4px' }}>({item.container_name})</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px', color: 'var(--color-text-muted)' }}>
                      {expected}
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>
                      <input
                        type="number"
                        min="0"
                        className="input"
                        value={actualCounts[item.id] || ''}
                        onChange={(e) => setActualCounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                        style={{
                          width: '70px',
                          textAlign: 'center',
                          fontSize: '14px',
                          padding: '4px 6px',
                          fontWeight: '600',
                          border: diff !== 0 ? '2px solid #f59e0b' : '1px solid var(--color-border)'
                        }}
                      />
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '8px',
                      fontWeight: '600',
                      color: diff === 0 ? 'var(--color-text-muted)' : diff > 0 ? '#22c55e' : '#ef4444'
                    }}>
                      {diff === 0 ? '-' : (diff > 0 ? `+${diff}` : diff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ padding: '10px 24px' }}
            >
              {submitting ? 'Saving...' : hasChanges ? 'Confirm & Adjust' : 'Confirm All Correct'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InventoryCheck;
