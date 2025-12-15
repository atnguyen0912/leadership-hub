import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function InventoryStockSection({
  inventoryItems,
  onViewLots,
  onOpenAdjustment,
  onRefresh,
  isRefreshing
}) {
  const activeItems = inventoryItems.filter(item => item.active);
  const totalValue = activeItems.reduce((sum, item) => sum + ((item.quantity_on_hand || 0) * (item.unit_cost || 0)), 0);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', color: 'var(--color-primary)', margin: 0 }}>
          Inventory Levels
        </h2>
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
      <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px', marginBottom: '16px' }}>
        View current inventory levels, FIFO lots, and make adjustments for lost/wasted/donated items.
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
                <th style={{ textAlign: 'right' }}>Unit Cost</th>
                <th style={{ textAlign: 'right' }}>Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeItems.map((item) => (
                <tr key={item.id} style={{ background: item.quantity_on_hand <= 0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
                  <td>
                    <span style={{ color: item.quantity_on_hand <= 5 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                      {item.name}
                    </span>
                    {item.quantity_on_hand <= 5 && item.quantity_on_hand > 0 && (
                      <span style={{ color: 'var(--color-warning)', fontSize: '11px', marginLeft: '8px' }}>LOW</span>
                    )}
                    {item.quantity_on_hand <= 0 && (
                      <span style={{ color: 'var(--color-danger)', fontSize: '11px', marginLeft: '8px' }}>OUT</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold', color: item.quantity_on_hand <= 0 ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                    {item.quantity_on_hand || 0}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-subtle)' }}>
                    {formatCurrency(item.unit_cost || 0)}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>
                    {formatCurrency((item.quantity_on_hand || 0) * (item.unit_cost || 0))}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--color-primary)' }}>
                <td style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>Total Value</td>
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
    </div>
  );
}

export default InventoryStockSection;
