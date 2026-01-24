import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';

function InventoryVerificationModal({ items, onClose, onSave, isLoading }) {
  const [verifiedBy, setVerifiedBy] = useState('');
  const [verifications, setVerifications] = useState(
    items.map(item => ({
      menu_item_id: item.id,
      name: item.name,
      item_type: item.item_type || 'sellable',
      container_name: item.container_name,
      system_quantity: item.quantity_on_hand || 0,
      actual_quantity: item.quantity_on_hand || 0,
      selected: false,
      inventory_confidence: item.inventory_confidence || 'never'
    }))
  );
  const [filter, setFilter] = useState('all'); // all, stale, selected

  // Filter items based on selection
  const filteredVerifications = useMemo(() => {
    switch (filter) {
      case 'stale':
        return verifications.filter(v => v.inventory_confidence === 'stale' || v.inventory_confidence === 'never');
      case 'selected':
        return verifications.filter(v => v.selected);
      default:
        return verifications;
    }
  }, [verifications, filter]);

  // Calculate summary
  const summary = useMemo(() => {
    const selected = verifications.filter(v => v.selected);
    const discrepancies = selected.filter(v => v.actual_quantity !== v.system_quantity);
    return {
      selectedCount: selected.length,
      discrepancyCount: discrepancies.length,
      totalDiscrepancy: discrepancies.reduce((sum, v) => sum + (v.actual_quantity - v.system_quantity), 0)
    };
  }, [verifications]);

  const updateSelection = (menuItemId, checked) => {
    setVerifications(verifications.map(v =>
      v.menu_item_id === menuItemId ? { ...v, selected: checked } : v
    ));
  };

  const updateActual = (menuItemId, value) => {
    const numValue = parseFloat(value) || 0;
    setVerifications(verifications.map(v =>
      v.menu_item_id === menuItemId ? { ...v, actual_quantity: numValue, selected: true } : v
    ));
  };

  const selectAll = () => {
    setVerifications(verifications.map(v => ({ ...v, selected: true })));
  };

  const selectNone = () => {
    setVerifications(verifications.map(v => ({ ...v, selected: false })));
  };

  const selectStale = () => {
    setVerifications(verifications.map(v => ({
      ...v,
      selected: v.inventory_confidence === 'stale' || v.inventory_confidence === 'never'
    })));
  };

  const handleSave = () => {
    const selectedItems = verifications
      .filter(v => v.selected)
      .map(v => ({
        menu_item_id: v.menu_item_id,
        actual_quantity: v.actual_quantity
      }));

    if (selectedItems.length === 0) {
      alert('Please select at least one item to verify');
      return;
    }

    onSave({
      verified_by: verifiedBy,
      verification_type: 'standalone',
      items: selectedItems
    });
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      verified: '#22c55e',
      estimated: '#f59e0b',
      stale: '#ef4444',
      never: '#94a3b8'
    };
    return colors[status] || colors.never;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px', maxHeight: '85vh', overflowY: 'auto' }}
      >
        <h2 style={{ marginBottom: '8px', color: 'var(--color-primary)' }}>
          📋 Verify Inventory
        </h2>
        <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px', marginBottom: '16px' }}>
          Check items to verify and enter actual counts. Leave unchecked to skip.
        </p>

        {/* Verified By Input */}
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

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>Select:</span>
          <button className="btn btn-small" onClick={selectAll} style={{ padding: '4px 10px', fontSize: '12px' }}>
            All
          </button>
          <button className="btn btn-small" onClick={selectNone} style={{ padding: '4px 10px', fontSize: '12px' }}>
            None
          </button>
          <button className="btn btn-small" onClick={selectStale} style={{ padding: '4px 10px', fontSize: '12px', background: 'var(--color-warning)' }}>
            Stale Items
          </button>
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--color-text-subtle)' }}>Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input"
            style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
          >
            <option value="all">All Items</option>
            <option value="stale">Stale/Never</option>
            <option value="selected">Selected Only</option>
          </select>
        </div>

        {/* Summary */}
        {summary.selectedCount > 0 && (
          <div style={{
            background: summary.discrepancyCount > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            borderRadius: '6px',
            padding: '10px 14px',
            marginBottom: '16px',
            display: 'flex',
            gap: '16px',
            fontSize: '13px'
          }}>
            <span><strong>{summary.selectedCount}</strong> items selected</span>
            {summary.discrepancyCount > 0 && (
              <>
                <span style={{ color: 'var(--color-warning)' }}>
                  <strong>{summary.discrepancyCount}</strong> discrepancies
                </span>
                <span style={{ color: summary.totalDiscrepancy >= 0 ? '#22c55e' : '#ef4444' }}>
                  Net: {summary.totalDiscrepancy >= 0 ? '+' : ''}{summary.totalDiscrepancy}
                </span>
              </>
            )}
          </div>
        )}

        {/* Verification List */}
        <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '16px' }}>
          {filteredVerifications.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-subtle)', padding: '20px' }}>
              No items match the current filter.
            </p>
          ) : (
            <table style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Item</th>
                  <th style={{ textAlign: 'center' }}>System</th>
                  <th style={{ textAlign: 'center', width: '100px' }}>Actual</th>
                  <th style={{ textAlign: 'center' }}>Diff</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredVerifications.map((v) => {
                  const discrepancy = v.actual_quantity - v.system_quantity;
                  const isBulk = v.item_type === 'bulk_ingredient';

                  return (
                    <tr
                      key={v.menu_item_id}
                      style={{
                        background: v.selected
                          ? (discrepancy !== 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)')
                          : 'transparent'
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={v.selected}
                          onChange={(e) => updateSelection(v.menu_item_id, e.target.checked)}
                          style={{ width: '16px', height: '16px' }}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{v.name}</span>
                          {isBulk && (
                            <span style={{
                              fontSize: '9px',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              background: '#dbeafe',
                              color: '#3b82f6',
                              fontWeight: '600'
                            }}>
                              {v.container_name || 'containers'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        {v.system_quantity}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          className="input"
                          step={isBulk ? '0.5' : '1'}
                          min="0"
                          value={v.actual_quantity}
                          onChange={(e) => updateActual(v.menu_item_id, e.target.value)}
                          style={{
                            width: '80px',
                            padding: '4px 8px',
                            textAlign: 'center',
                            fontSize: '13px'
                          }}
                        />
                      </td>
                      <td style={{
                        textAlign: 'center',
                        fontWeight: discrepancy !== 0 ? 'bold' : 'normal',
                        color: discrepancy > 0 ? '#22c55e' : discrepancy < 0 ? '#ef4444' : 'var(--color-text-subtle)'
                      }}>
                        {v.selected && discrepancy !== 0 ? (
                          <span>{discrepancy > 0 ? '+' : ''}{discrepancy}</span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: getStatusColor(v.inventory_confidence)
                          }}
                          title={v.inventory_confidence || 'never'}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Bulk Item Note */}
        {verifications.some(v => v.item_type === 'bulk_ingredient' && v.selected) && (
          <p style={{
            fontSize: '11px',
            color: 'var(--color-text-subtle)',
            background: 'var(--color-bg-input)',
            padding: '8px 12px',
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            💡 For bulk items, count containers. Use 0.5 for partial containers.
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            className="btn"
            onClick={onClose}
            style={{ background: 'var(--color-text-muted)' }}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isLoading || summary.selectedCount === 0}
          >
            {isLoading ? 'Saving...' : `Verify ${summary.selectedCount} Item${summary.selectedCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InventoryVerificationModal;
