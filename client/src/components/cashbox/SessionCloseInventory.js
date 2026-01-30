import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';

function SessionCloseInventory({ session, onComplete, onSkip }) {
  const [mode, setMode] = useState(null); // null = choice screen, 'quick', 'reconcile'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');

  // Inventory items with expected quantities
  const [preciseItems, setPreciseItems] = useState([]);
  const [bulkItems, setBulkItems] = useState([]);

  // Session summary data
  const [sessionSummary, setSessionSummary] = useState(null);

  // Discrepancy reasons
  const discrepancyReasons = [
    { value: '', label: 'Select reason...' },
    { value: 'lost', label: 'Lost/Missing' },
    { value: 'wasted', label: 'Wasted/Damaged' },
    { value: 'donated', label: 'Donated/Given Away' },
    { value: 'count_error', label: 'Previous Count Error' },
    { value: 'other', label: 'Other' }
  ];

  // Fetch inventory and session data on mount
  useEffect(() => {
    fetchData();
  }, [session.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch current inventory
      const invResponse = await fetch('/api/inventory');
      const invData = await invResponse.json();

      // Fetch session summary
      const summaryResponse = await fetch(`/api/orders/session/${session.id}/summary`);
      const summaryData = await summaryResponse.json();
      setSessionSummary(summaryData);

      // Fetch bulk inventory for this session
      const bulkResponse = await fetch(`/api/sessions/${session.id}/bulk-inventory`);
      const bulkData = await bulkResponse.json();

      if (invResponse.ok) {
        // Separate items by type
        const tracked = invData.filter(item => item.active && item.track_inventory);

        // For precise items, the "expected" is the current system quantity
        // (inventory was already deducted during sales)
        const precise = tracked
          .filter(item => item.item_type !== 'bulk_ingredient')
          .map(item => ({
            menuItemId: item.id,
            name: item.name,
            expected: item.quantity_on_hand || 0,
            actual: item.quantity_on_hand || 0,
            reason: '',
            notes: ''
          }));

        // For bulk items, merge with session bulk inventory data
        const bulk = tracked
          .filter(item => item.item_type === 'bulk_ingredient')
          .map(item => {
            const sessionBulk = bulkData.find(b => b.menu_item_id === item.id);
            return {
              menuItemId: item.id,
              name: item.name,
              containerName: item.container_name || 'containers',
              servingsPerContainer: item.servings_per_container,
              costPerContainer: item.cost_per_container || 0,
              startingContainers: sessionBulk?.starting_containers || item.quantity_on_hand || 0,
              endingContainers: sessionBulk?.ending_containers ?? item.quantity_on_hand ?? 0,
              estimatedServingsSold: 0, // Would need to track this from order processing
              notes: sessionBulk?.notes || ''
            };
          });

        setPreciseItems(precise);
        setBulkItems(bulk);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary statistics
  const summary = useMemo(() => {
    const preciseDiscrepancies = preciseItems.filter(i => i.actual !== i.expected);
    const totalPreciseDiscrepancy = preciseItems.reduce((sum, i) => sum + (i.actual - i.expected), 0);

    const bulkContainersUsed = bulkItems.reduce((sum, i) =>
      sum + (i.startingContainers - i.endingContainers), 0
    );
    const bulkCost = bulkItems.reduce((sum, i) =>
      sum + ((i.startingContainers - i.endingContainers) * (i.costPerContainer || 0)), 0
    );

    return {
      preciseDiscrepancyCount: preciseDiscrepancies.length,
      totalPreciseDiscrepancy,
      bulkContainersUsed,
      bulkCost
    };
  }, [preciseItems, bulkItems]);

  // Handle quick close
  const handleQuickClose = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/sessions/${session.id}/end-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skipVerification: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record end inventory');
      }

      onComplete({ skipped: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle reconciled close
  const handleReconciledClose = async () => {
    if (!verifiedBy.trim()) {
      setError('Please enter your name');
      return;
    }

    // Check if discrepancies have reasons
    const unresolvedDiscrepancies = preciseItems.filter(
      i => i.actual !== i.expected && !i.reason
    );
    if (unresolvedDiscrepancies.length > 0) {
      setError(`Please select a reason for all discrepancies (${unresolvedDiscrepancies.length} remaining)`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/sessions/${session.id}/end-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiedBy: verifiedBy.trim(),
          skipVerification: false,
          preciseItems: preciseItems.map(item => ({
            menuItemId: item.menuItemId,
            expected: item.expected,
            actual: item.actual,
            reason: item.reason || null,
            notes: item.notes || null
          })),
          bulkItems: bulkItems.map(item => ({
            menuItemId: item.menuItemId,
            startingContainers: item.startingContainers,
            endingContainers: item.endingContainers,
            notes: item.notes || null
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save inventory');
      }

      onComplete({
        verified: true,
        discrepancies: data.discrepancies,
        discrepancyCount: data.discrepancyCount,
        totalDiscrepancyCost: data.totalDiscrepancyCost
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
      if (field === 'actual') {
        return { ...item, actual: parseFloat(value) || 0 };
      }
      return { ...item, [field]: value };
    }));
  };

  // Update bulk item
  const updateBulkItem = (menuItemId, field, value) => {
    setBulkItems(items => items.map(item => {
      if (item.menuItemId !== menuItemId) return item;
      if (field === 'endingContainers') {
        return { ...item, endingContainers: parseFloat(value) || 0 };
      }
      return { ...item, [field]: value };
    }));
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
          📦 Session Complete!
        </h2>

        {/* Session Summary */}
        {sessionSummary && (
          <div style={{
            background: 'var(--color-bg-input)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
              <div>
                <p style={{ color: 'var(--color-text-subtle)', margin: '0 0 4px 0', fontSize: '11px' }}>Total Sales</p>
                <p style={{ color: 'var(--color-primary)', margin: 0, fontWeight: 'bold', fontSize: '18px' }}>
                  {formatCurrency(sessionSummary.total_revenue || sessionSummary.totalSales || 0)}
                </p>
              </div>
              <div>
                <p style={{ color: 'var(--color-text-subtle)', margin: '0 0 4px 0', fontSize: '11px' }}>Orders</p>
                <p style={{ color: 'var(--color-primary)', margin: 0, fontWeight: 'bold', fontSize: '18px' }}>
                  {sessionSummary.total_orders || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setMode('quick');
              handleQuickClose();
            }}
            disabled={saving}
            style={{ padding: '16px', fontSize: '16px' }}
          >
            <div>⚡ Quick Close</div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
              Close without counting inventory
            </div>
          </button>

          <button
            className="btn"
            onClick={() => setMode('reconcile')}
            disabled={saving}
            style={{ padding: '16px', fontSize: '16px' }}
          >
            <div>📋 Reconcile Inventory</div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
              Count and verify end-of-session quantities
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

  // Reconciliation screen
  return (
    <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ color: 'var(--color-primary)', marginBottom: '8px' }}>
        📋 End-of-Session Reconciliation
      </h2>
      <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px', marginBottom: '16px' }}>
        Count actual quantities and note any discrepancies.
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

      {/* Summary Banner */}
      {summary.preciseDiscrepancyCount > 0 && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '16px',
          display: 'flex',
          gap: '20px',
          fontSize: '13px'
        }}>
          <span>
            <strong>{summary.preciseDiscrepancyCount}</strong> discrepancies found
          </span>
          <span style={{ color: summary.totalPreciseDiscrepancy >= 0 ? '#22c55e' : '#ef4444' }}>
            Net: {summary.totalPreciseDiscrepancy >= 0 ? '+' : ''}{summary.totalPreciseDiscrepancy}
          </span>
        </div>
      )}

      {/* Precise Items Section */}
      {preciseItems.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: 'var(--color-text-muted)', marginBottom: '12px', fontSize: '15px' }}>
            Precise Items
          </h3>

          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
            <table style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{ textAlign: 'center' }}>Expected</th>
                  <th style={{ textAlign: 'center', width: '90px' }}>Actual</th>
                  <th style={{ textAlign: 'center' }}>Diff</th>
                  <th style={{ width: '150px' }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {preciseItems.map(item => {
                  const diff = item.actual - item.expected;
                  const hasDiscrepancy = diff !== 0;
                  return (
                    <tr key={item.menuItemId} style={{
                      background: hasDiscrepancy
                        ? (item.reason ? 'rgba(34, 197, 94, 0.05)' : 'rgba(245, 158, 11, 0.1)')
                        : 'transparent'
                    }}>
                      <td>{item.name}</td>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{item.expected}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          className="input"
                          min="0"
                          value={item.actual}
                          onChange={(e) => updatePreciseItem(item.menuItemId, 'actual', e.target.value)}
                          style={{
                            width: '70px',
                            padding: '4px',
                            textAlign: 'center',
                            fontSize: '13px',
                            borderColor: hasDiscrepancy && !item.reason ? 'var(--color-warning)' : undefined
                          }}
                        />
                      </td>
                      <td style={{
                        textAlign: 'center',
                        fontWeight: hasDiscrepancy ? 'bold' : 'normal',
                        color: diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : 'var(--color-text-subtle)'
                      }}>
                        {hasDiscrepancy ? (diff > 0 ? '+' : '') + diff : '—'}
                      </td>
                      <td>
                        {hasDiscrepancy && (
                          <select
                            className="input"
                            value={item.reason}
                            onChange={(e) => updatePreciseItem(item.menuItemId, 'reason', e.target.value)}
                            style={{
                              padding: '4px',
                              fontSize: '12px',
                              width: '100%',
                              borderColor: !item.reason ? 'var(--color-warning)' : undefined
                            }}
                          >
                            {discrepancyReasons.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        )}
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
            Bulk Items (count containers remaining)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bulkItems.map(item => {
              const containersUsed = item.startingContainers - item.endingContainers;
              const cost = containersUsed * (item.costPerContainer || 0);
              return (
                <div key={item.menuItemId} style={{
                  background: 'var(--color-bg-input)',
                  padding: '16px',
                  borderRadius: '6px',
                  borderLeft: '3px solid #3b82f6'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <span style={{ fontWeight: '500', color: 'var(--color-text-muted)' }}>
                        {item.name}
                      </span>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>
                        Started: {item.startingContainers} {item.containerName}s
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--color-text-subtle)', display: 'block', marginBottom: '4px' }}>
                          Remaining:
                        </label>
                        <input
                          type="number"
                          className="input"
                          step="0.5"
                          min="0"
                          value={item.endingContainers}
                          onChange={(e) => updateBulkItem(item.menuItemId, 'endingContainers', e.target.value)}
                          style={{ width: '80px', padding: '6px', textAlign: 'center' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    gap: '20px',
                    fontSize: '13px'
                  }}>
                    <span style={{ color: containersUsed > 0 ? 'var(--color-warning)' : 'var(--color-text-subtle)' }}>
                      Used: <strong>{containersUsed.toFixed(1)}</strong> {item.containerName}s
                    </span>
                    {item.costPerContainer > 0 && (
                      <span style={{ color: 'var(--color-text-subtle)' }}>
                        Cost: {formatCurrency(cost)}
                      </span>
                    )}
                    {item.servingsPerContainer && (
                      <span style={{ color: 'var(--color-text-subtle)' }}>
                        ~{Math.round(containersUsed * item.servingsPerContainer)} servings
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bulk Cost Summary */}
          {summary.bulkCost > 0 && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '6px',
              fontSize: '13px'
            }}>
              <strong>Total Bulk Cost:</strong> {formatCurrency(summary.bulkCost)}
            </div>
          )}
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
          onClick={handleReconciledClose}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save & Complete'}
        </button>
      </div>
    </div>
  );
}

export default SessionCloseInventory;
