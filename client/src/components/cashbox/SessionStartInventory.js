import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';

function SessionStartInventory({ sessionId, onComplete, onSkip }) {
  const [mode, setMode] = useState(null); // null = choice screen, 'quick', 'verify'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');

  // Inventory items
  const [preciseItems, setPreciseItems] = useState([]);
  const [bulkItems, setBulkItems] = useState([]);

  // Fetch inventory items on mount
  useEffect(() => {
    fetchInventoryItems();
  }, []);

  const fetchInventoryItems = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/inventory');
      const data = await response.json();

      if (response.ok) {
        // Separate items by type
        const tracked = data.filter(item => item.active && item.track_inventory);

        const precise = tracked
          .filter(item => item.item_type !== 'bulk_ingredient')
          .map(item => ({
            menuItemId: item.id,
            name: item.name,
            systemQuantity: item.quantity_on_hand || 0,
            quantity: item.quantity_on_hand || 0,
            inventoryConfidence: item.inventory_confidence || 'never',
            selected: false
          }));

        const bulk = tracked
          .filter(item => item.item_type === 'bulk_ingredient')
          .map(item => ({
            menuItemId: item.id,
            name: item.name,
            containerName: item.container_name || 'containers',
            servingsPerContainer: item.servings_per_container,
            systemQuantity: item.quantity_on_hand || 0,
            startingContainers: item.quantity_on_hand || 0,
            inventoryConfidence: item.inventory_confidence || 'never',
            notes: ''
          }));

        setPreciseItems(precise);
        setBulkItems(bulk);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      setError('Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stale items count
  const staleCount = useMemo(() => {
    const preciseStale = preciseItems.filter(i =>
      i.inventoryConfidence === 'stale' || i.inventoryConfidence === 'never'
    ).length;
    const bulkStale = bulkItems.filter(i =>
      i.inventoryConfidence === 'stale' || i.inventoryConfidence === 'never'
    ).length;
    return preciseStale + bulkStale;
  }, [preciseItems, bulkItems]);

  // Handle quick start
  const handleQuickStart = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/sessions/${sessionId}/start-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skipVerification: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start session');
      }

      onComplete({ skipped: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle verified start
  const handleVerifiedStart = async () => {
    if (!verifiedBy.trim()) {
      setError('Please enter your name');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const selectedPrecise = preciseItems
        .filter(item => item.selected)
        .map(item => ({
          menuItemId: item.menuItemId,
          systemQuantity: item.systemQuantity,
          quantity: item.quantity
        }));

      const response = await fetch(`/api/sessions/${sessionId}/start-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiedBy: verifiedBy.trim(),
          skipVerification: false,
          preciseItems: selectedPrecise,
          bulkItems: bulkItems.map(item => ({
            menuItemId: item.menuItemId,
            startingContainers: item.startingContainers,
            notes: item.notes
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save inventory');
      }

      onComplete({
        verified: true,
        preciseItemsCount: data.preciseItemsCount,
        bulkItemsCount: data.bulkItemsCount
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Update precise item
  const updatePreciseItem = (menuItemId, field, value) => {
    setPreciseItems(items => items.map(item => {
      if (item.menuItemId !== menuItemId) return item;
      if (field === 'quantity') {
        return { ...item, quantity: parseFloat(value) || 0, selected: true };
      }
      return { ...item, [field]: value };
    }));
  };

  // Update bulk item
  const updateBulkItem = (menuItemId, field, value) => {
    setBulkItems(items => items.map(item => {
      if (item.menuItemId !== menuItemId) return item;
      if (field === 'startingContainers') {
        return { ...item, startingContainers: parseFloat(value) || 0 };
      }
      return { ...item, [field]: value };
    }));
  };

  // Select/deselect all precise items
  const selectAllPrecise = (selected) => {
    setPreciseItems(items => items.map(item => ({ ...item, selected })));
  };

  // Select stale items only
  const selectStaleItems = () => {
    setPreciseItems(items => items.map(item => ({
      ...item,
      selected: item.inventoryConfidence === 'stale' || item.inventoryConfidence === 'never'
    })));
  };

  // Get verification badge
  const getStatusBadge = (status) => {
    const badges = {
      verified: { icon: '🟢', color: '#22c55e' },
      estimated: { icon: '🟡', color: '#f59e0b' },
      stale: { icon: '🔴', color: '#ef4444' },
      never: { icon: '⚪', color: '#94a3b8' }
    };
    return badges[status] || badges.never;
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--color-text-subtle)' }}>Loading inventory...</p>
      </div>
    );
  }

  // Choice screen
  if (mode === null) {
    return (
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h2 style={{ color: 'var(--color-primary)', marginBottom: '16px', textAlign: 'center' }}>
          📦 Starting Inventory
        </h2>

        {staleCount > 0 && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <p style={{ color: 'var(--color-danger)', margin: 0, fontSize: '14px' }}>
              ⚠️ {staleCount} item{staleCount !== 1 ? 's' : ''} haven't been verified recently
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setMode('quick');
              handleQuickStart();
            }}
            disabled={saving}
            style={{ padding: '16px', fontSize: '16px' }}
          >
            <div>⚡ Quick Start</div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
              Skip verification, use system quantities
            </div>
          </button>

          <button
            className="btn"
            onClick={() => setMode('verify')}
            disabled={saving}
            style={{ padding: '16px', fontSize: '16px' }}
          >
            <div>📋 Verify Inventory First</div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
              Count and confirm quantities before starting
            </div>
          </button>
        </div>

        {error && (
          <p style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '16px' }}>
            {error}
          </p>
        )}

        {onSkip && (
          <button
            className="btn"
            onClick={onSkip}
            style={{ marginTop: '16px', width: '100%', background: 'var(--color-text-subtle)' }}
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  // Verification screen
  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: 'var(--color-primary)', marginBottom: '8px' }}>
        📋 Verify Starting Inventory
      </h2>
      <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px', marginBottom: '16px' }}>
        Verify counts before starting the session. Check items you've counted and enter actual quantities.
      </p>

      {/* Verified By */}
      <div className="form-group" style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '13px' }}>Verified By</label>
        <input
          type="text"
          className="input"
          placeholder="Your name"
          value={verifiedBy}
          onChange={(e) => setVerifiedBy(e.target.value)}
          style={{ maxWidth: '200px' }}
        />
      </div>

      {/* Precise Items Section */}
      {preciseItems.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '15px' }}>
              Precise Items ({preciseItems.filter(i => i.selected).length}/{preciseItems.length} selected)
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-small" onClick={() => selectAllPrecise(true)} style={{ padding: '4px 8px', fontSize: '11px' }}>
                All
              </button>
              <button className="btn btn-small" onClick={() => selectAllPrecise(false)} style={{ padding: '4px 8px', fontSize: '11px' }}>
                None
              </button>
              <button className="btn btn-small" onClick={selectStaleItems} style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--color-warning)' }}>
                Stale
              </button>
            </div>
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
            <table style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Item</th>
                  <th style={{ textAlign: 'center' }}>System</th>
                  <th style={{ textAlign: 'center', width: '90px' }}>Actual</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {preciseItems.map(item => {
                  const badge = getStatusBadge(item.inventoryConfidence);
                  const diff = item.quantity - item.systemQuantity;
                  return (
                    <tr key={item.menuItemId} style={{
                      background: item.selected ? (diff !== 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)') : 'transparent'
                    }}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => updatePreciseItem(item.menuItemId, 'selected', e.target.checked)}
                          style={{ width: '16px', height: '16px' }}
                        />
                      </td>
                      <td>{item.name}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{item.systemQuantity}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          className="input"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updatePreciseItem(item.menuItemId, 'quantity', e.target.value)}
                          style={{ width: '70px', padding: '4px', textAlign: 'center', fontSize: '13px' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '12px' }}>{badge.icon}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Items Section */}
      {bulkItems.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: 'var(--color-text-muted)', marginBottom: '12px', fontSize: '15px' }}>
            Bulk Items (count containers)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bulkItems.map(item => {
              const badge = getStatusBadge(item.inventoryConfidence);
              return (
                <div key={item.menuItemId} style={{
                  background: 'var(--color-bg-input)',
                  padding: '12px',
                  borderRadius: '6px',
                  borderLeft: '3px solid #3b82f6'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ flex: 1, color: 'var(--color-text-muted)', fontWeight: '500' }}>
                      {item.name}
                      <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginLeft: '8px' }}>
                        ({item.containerName})
                      </span>
                    </span>
                    <span style={{ fontSize: '12px' }}>{badge.icon}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        className="input"
                        step="0.5"
                        min="0"
                        value={item.startingContainers}
                        onChange={(e) => updateBulkItem(item.menuItemId, 'startingContainers', e.target.value)}
                        style={{ width: '70px', padding: '6px', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                        {item.containerName}s
                      </span>
                    </div>
                  </div>
                  {item.servingsPerContainer && (
                    <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', margin: '4px 0 0 0' }}>
                      ~{item.startingContainers * item.servingsPerContainer} total servings estimated
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--color-danger)', marginBottom: '16px' }}>{error}</p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          className="btn"
          onClick={() => setMode(null)}
          style={{ background: 'var(--color-text-muted)' }}
        >
          Back
        </button>
        <button
          className="btn btn-primary"
          onClick={handleVerifiedStart}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save & Start Session'}
        </button>
      </div>
    </div>
  );
}

export default SessionStartInventory;
