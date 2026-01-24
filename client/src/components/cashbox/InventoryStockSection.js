import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

function InventoryStockSection({
  inventoryItems,
  onViewLots,
  onOpenAdjustment,
  onRefresh,
  isRefreshing,
  onMarkUsage,
  onToggleLiquid,
  onOpenVerification
}) {
  const activeItems = inventoryItems.filter(item => item.active);
  const totalValue = activeItems.reduce((sum, item) => sum + ((item.quantity_on_hand || 0) * (item.unit_cost || 0)), 0);

  // Calculate verification summary
  const verificationSummary = activeItems.reduce((acc, item) => {
    const status = item.inventory_confidence || 'never';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, { verified: 0, estimated: 0, stale: 0, never: 0 });

  // State for usage marking modal
  const [markingItem, setMarkingItem] = useState(null);
  const [usagePercent, setUsagePercent] = useState('');

  // Get verification badge for item
  const getVerificationBadge = (item) => {
    const status = item.inventory_confidence || 'never';
    const badges = {
      verified: { icon: '🟢', label: 'Verified', color: '#22c55e' },
      estimated: { icon: '🟡', label: 'Est.', color: '#f59e0b' },
      stale: { icon: '🔴', label: 'Stale', color: '#ef4444' },
      never: { icon: '⚪', label: 'Never', color: '#94a3b8' }
    };
    return badges[status] || badges.never;
  };

  // Format last check date
  const formatLastCheck = (date) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const handleMarkUsage = async () => {
    if (!markingItem || !usagePercent) return;
    const percent = parseInt(usagePercent);
    if (percent < 0 || percent > 100) return;

    if (onMarkUsage) {
      await onMarkUsage(markingItem.id, percent);
    }
    setMarkingItem(null);
    setUsagePercent('');
    if (onRefresh) onRefresh();
  };

  const handleToggleLiquid = async (item) => {
    if (onToggleLiquid) {
      await onToggleLiquid(item.id, !item.is_liquid);
      if (onRefresh) onRefresh();
    }
  };

  // Helper to get fill bar class
  const getFillBarClass = (percent) => {
    if (percent <= 0) return 'empty';
    if (percent <= 25) return 'low';
    return '';
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '18px', color: 'var(--color-primary)', margin: 0 }}>
          Inventory Levels
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Verification Summary */}
          <div style={{
            display: 'flex',
            gap: '8px',
            padding: '4px 10px',
            background: 'var(--color-bg-input)',
            borderRadius: '6px',
            fontSize: '12px'
          }}>
            <span title="Verified (checked within 7 days)">🟢 {verificationSummary.verified}</span>
            <span title="Estimated (checked within 14 days)">🟡 {verificationSummary.estimated}</span>
            <span title="Stale (not checked in 14+ days)">🔴 {verificationSummary.stale}</span>
            <span title="Never verified">⚪ {verificationSummary.never}</span>
          </div>
          {onOpenVerification && (
            <button
              className="btn btn-small"
              onClick={onOpenVerification}
              style={{ padding: '6px 12px', background: 'var(--color-warning)' }}
              title="Verify inventory counts"
            >
              📋 Verify
            </button>
          )}
          {onRefresh && (
            <button
              className="btn btn-small"
              onClick={onRefresh}
              disabled={isRefreshing}
              style={{ padding: '6px 12px' }}
            >
              {isRefreshing ? 'Refreshing...' : '↻ Refresh'}
            </button>
          )}
        </div>
      </div>
      {(verificationSummary.stale > 0 || verificationSummary.never > 0) && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '6px',
          padding: '8px 12px',
          marginBottom: '12px',
          fontSize: '12px',
          color: 'var(--color-danger)'
        }}>
          ⚠️ {verificationSummary.stale + verificationSummary.never} item{(verificationSummary.stale + verificationSummary.never) !== 1 ? 's' : ''} need{(verificationSummary.stale + verificationSummary.never) === 1 ? 's' : ''} verification
        </div>
      )}
      <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px', marginBottom: '16px' }}>
        View current inventory levels, FIFO lots, and make adjustments. Liquid items show fill percentage.
      </p>

      {activeItems.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-subtle)' }}>No inventory items found.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign: 'center' }}>On Hand</th>
                <th style={{ textAlign: 'center' }}>Last Check</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Unit Cost</th>
                <th style={{ textAlign: 'right' }}>Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeItems.map((item) => {
                const fillPercent = item.fill_percentage ?? 100;
                const isLiquid = item.is_liquid === 1;

                return (
                  <tr key={item.id} style={{ background: item.quantity_on_hand <= 0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: item.quantity_on_hand <= 5 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                          {item.name}
                        </span>
                        {isLiquid && (
                          <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)', background: 'var(--color-bg-card-solid)', padding: '2px 4px', borderRadius: '3px' }}>
                            JAR
                          </span>
                        )}
                        {item.quantity_on_hand <= 5 && item.quantity_on_hand > 0 && (
                          <span style={{ color: 'var(--color-warning)', fontSize: '11px' }}>LOW</span>
                        )}
                        {item.quantity_on_hand <= 0 && (
                          <span style={{ color: 'var(--color-danger)', fontSize: '11px' }}>OUT</span>
                        )}
                      </div>
                      {/* Show fill bar for liquid items */}
                      {isLiquid && item.quantity_on_hand > 0 && (
                        <div className="fill-indicator" style={{ marginTop: '4px' }}>
                          <div className="fill-bar">
                            <div
                              className={`fill-bar-inner ${getFillBarClass(fillPercent)}`}
                              style={{ width: `${fillPercent}%` }}
                            />
                          </div>
                          <span>{fillPercent}%</span>
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: item.quantity_on_hand <= 0 ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                      {item.quantity_on_hand || 0}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                      {formatLastCheck(item.last_inventory_check)}
                      {item.last_checked_by && (
                        <div style={{ fontSize: '10px', color: 'var(--color-text-subtle)' }}>
                          by {item.last_checked_by}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {(() => {
                        const badge = getVerificationBadge(item);
                        return (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: `${badge.color}20`,
                              color: badge.color,
                              fontWeight: '600'
                            }}
                            title={`Status: ${badge.label}`}
                          >
                            {badge.icon} {badge.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--color-text-subtle)' }}>
                      {formatCurrency(item.unit_cost || 0)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                      {formatCurrency((item.quantity_on_hand || 0) * (item.unit_cost || 0))}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-small"
                          onClick={() => onViewLots(item)}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          Lots
                        </button>
                        <button
                          className="btn btn-small"
                          onClick={() => onOpenAdjustment(item)}
                          style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--color-text-subtle)' }}
                        >
                          Adjust
                        </button>
                        {/* Liquid item controls */}
                        {isLiquid && item.quantity_on_hand > 0 && (
                          <button
                            className="btn btn-small"
                            onClick={() => {
                              setMarkingItem(item);
                              setUsagePercent('25');
                            }}
                            style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--color-warning)' }}
                            title="Mark usage percentage"
                          >
                            Use %
                          </button>
                        )}
                        <button
                          className="btn btn-small"
                          onClick={() => handleToggleLiquid(item)}
                          style={{
                            padding: '4px 6px',
                            fontSize: '10px',
                            background: isLiquid ? 'var(--color-primary)' : 'var(--color-bg-card-solid)',
                            opacity: 0.7
                          }}
                          title={isLiquid ? 'Remove liquid tracking' : 'Enable liquid tracking'}
                        >
                          {isLiquid ? '🫙' : '📦'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--color-primary)' }}>
                <td style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>Total Value</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                  {formatCurrency(totalValue)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Mark Usage Modal */}
      {markingItem && (
        <div className="modal-overlay" onClick={() => setMarkingItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '350px' }}>
            <h3 style={{ marginBottom: '16px' }}>Mark Usage: {markingItem.name}</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
              Current fill: <strong>{markingItem.fill_percentage ?? 100}%</strong>
            </p>

            {/* Quick buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {[10, 25, 50, 100].map(pct => (
                <button
                  key={pct}
                  type="button"
                  className={`btn btn-small ${usagePercent === pct.toString() ? 'btn-primary' : ''}`}
                  onClick={() => setUsagePercent(pct.toString())}
                  style={{ flex: 1 }}
                >
                  {pct}%
                </button>
              ))}
            </div>

            <div className="form-group">
              <label>Usage Amount (%)</label>
              <input
                type="number"
                className="input"
                min="1"
                max="100"
                value={usagePercent}
                onChange={(e) => setUsagePercent(e.target.value)}
                placeholder="25"
              />
              <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>
                New fill will be: {Math.max(0, (markingItem.fill_percentage ?? 100) - (parseInt(usagePercent) || 0))}%
                {(markingItem.fill_percentage ?? 100) - (parseInt(usagePercent) || 0) <= 0 && (
                  <span style={{ color: 'var(--color-warning)' }}> (will decrement quantity)</span>
                )}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn" onClick={() => setMarkingItem(null)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleMarkUsage}
                disabled={!usagePercent || parseInt(usagePercent) <= 0}
              >
                Mark Used
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryStockSection;
