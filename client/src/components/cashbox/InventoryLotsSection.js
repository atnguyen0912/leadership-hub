import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function InventoryLotsSection({
  inventoryItems,
  selectedInventoryItem,
  setSelectedInventoryItem,
  inventoryLots,
  inventoryTransactions = [],
  sessionSales = [],
  componentUsage = [],
  onFetchLots
}) {
  return (
    <div className="card">
      <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-primary)' }}>
        Inventory Lot Tracking (FIFO)
      </h2>
      <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px', marginBottom: '16px' }}>
        View inventory lots by purchase date and transaction history by session.
      </p>

      <div className="form-group" style={{ maxWidth: '300px', marginBottom: '16px' }}>
        <label>Select Item</label>
        <select
          className="input"
          value={selectedInventoryItem?.id || ''}
          onChange={(e) => {
            const item = inventoryItems.find(i => i.id === parseInt(e.target.value));
            setSelectedInventoryItem(item);
            if (item) onFetchLots(item.id);
          }}
        >
          <option value="">-- Select Item --</option>
          {inventoryItems.map(item => (
            <option key={item.id} value={item.id}>{item.name} ({item.quantity_on_hand} on hand)</option>
          ))}
        </select>
      </div>

      {selectedInventoryItem && inventoryLots.length > 0 && (
        <>
          <h3 style={{ fontSize: '15px', color: 'var(--color-text)', marginBottom: '8px' }}>Purchase Lots</h3>
          <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table>
              <thead>
                <tr>
                  <th>Purchase Date</th>
                  <th style={{ textAlign: 'center' }}>Original</th>
                  <th style={{ textAlign: 'center' }}>Remaining</th>
                  <th style={{ textAlign: 'right' }}>Unit Cost</th>
                  <th>Reimbursable</th>
                </tr>
              </thead>
              <tbody>
                {inventoryLots.map(lot => (
                  <tr key={lot.id}>
                    <td>{lot.purchase_date}</td>
                    <td style={{ textAlign: 'center' }}>{lot.quantity_original}</td>
                    <td style={{ textAlign: 'center', color: lot.quantity_remaining <= 0 ? 'var(--color-text-subtle)' : 'var(--color-primary)' }}>
                      {lot.quantity_remaining}
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(lot.unit_cost)}</td>
                    <td>
                      <span style={{ color: lot.is_reimbursable ? 'var(--color-primary)' : 'var(--color-warning)' }}>
                        {lot.is_reimbursable ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Session Sales - direct sales */}
      {selectedInventoryItem && sessionSales.length > 0 && (
        <>
          <h3 style={{ fontSize: '15px', color: 'var(--color-text)', marginBottom: '8px' }}>Sales by Session</h3>
          <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'center' }}>Qty Sold</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {sessionSales.map(s => (
                  <tr key={s.session_id}>
                    <td style={{ color: 'var(--color-text-muted)' }}>{s.session_name}</td>
                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{new Date(s.session_date).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#ef4444' }}>-{s.total_sold}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-primary)', fontWeight: '500' }}>{formatCurrency(s.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Component Usage - used as ingredient in composites */}
      {selectedInventoryItem && componentUsage.length > 0 && (
        <>
          <h3 style={{ fontSize: '15px', color: 'var(--color-text)', marginBottom: '8px' }}>Used as Ingredient</h3>
          <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>In</th>
                  <th style={{ textAlign: 'center' }}>Composites Sold</th>
                  <th style={{ textAlign: 'center' }}>Units Used</th>
                </tr>
              </thead>
              <tbody>
                {componentUsage.map((u, idx) => (
                  <tr key={idx}>
                    <td style={{ color: 'var(--color-text-muted)' }}>{u.session_name}</td>
                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{u.composite_name}</td>
                    <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{u.composites_sold}</td>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#ef4444' }}>-{u.total_used}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedInventoryItem && inventoryTransactions.length > 0 && (
        <>
          <h3 style={{ fontSize: '15px', color: 'var(--color-text)', marginBottom: '8px' }}>Transaction History</h3>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Session</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Unit Cost</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {inventoryTransactions.map(tx => {
                  const typeLabels = {
                    sale: 'Sale',
                    purchase: 'Purchase',
                    bulk_usage: 'Bulk Usage',
                    adjustment: 'Adjustment',
                    count_adjustment: 'Count Adj.',
                    lost: 'Lost',
                    wasted: 'Wasted',
                    donated: 'Donated'
                  };
                  const isDeduction = tx.quantity_change < 0;
                  return (
                    <tr key={tx.id}>
                      <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: '600',
                          background: isDeduction ? '#fef2f2' : '#f0fdf4',
                          color: isDeduction ? '#ef4444' : '#22c55e'
                        }}>
                          {typeLabels[tx.transaction_type] || tx.transaction_type}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {tx.session_name || (tx.session_id ? `Session #${tx.session_id}` : '-')}
                      </td>
                      <td style={{
                        textAlign: 'center',
                        fontWeight: '600',
                        color: isDeduction ? '#ef4444' : '#22c55e'
                      }}>
                        {tx.quantity_change > 0 ? '+' : ''}{tx.quantity_change}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '12px' }}>
                        {tx.unit_cost_at_time ? formatCurrency(tx.unit_cost_at_time) : '-'}
                      </td>
                      <td style={{ fontSize: '11px', color: 'var(--color-text-muted)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedInventoryItem && inventoryLots.length === 0 && inventoryTransactions.length === 0 && (
        <p style={{ color: 'var(--color-text-subtle)', textAlign: 'center' }}>No lots or transactions found for this item.</p>
      )}
    </div>
  );
}

export default InventoryLotsSection;
