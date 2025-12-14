import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function InventoryMovementsSection({
  loadingTransactions,
  inventoryTransactions
}) {
  return (
    <div className="card">
      <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-primary)' }}>
        Inventory Movements
      </h2>
      <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px', marginBottom: '16px' }}>
        Audit log of all inventory changes - sales, purchases, adjustments, and counts.
      </p>

      {loadingTransactions ? (
        <p style={{ color: 'var(--color-text-subtle)', textAlign: 'center' }}>Loading transactions...</p>
      ) : inventoryTransactions.length === 0 ? (
        <p style={{ color: 'var(--color-text-subtle)', textAlign: 'center' }}>No inventory movements recorded yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Type</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Unit Cost</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {inventoryTransactions.map(tx => (
                <tr key={tx.id}>
                  <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>{tx.menu_item_name}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: tx.transaction_type === 'sale' ? 'rgba(239, 68, 68, 0.2)' :
                                 tx.transaction_type === 'purchase' ? 'rgba(34, 197, 94, 0.2)' :
                                 tx.transaction_type === 'stock_update' ? 'rgba(59, 130, 246, 0.2)' :
                                 'rgba(234, 179, 8, 0.2)',
                      color: tx.transaction_type === 'sale' ? 'var(--color-danger)' :
                             tx.transaction_type === 'purchase' ? 'var(--color-primary)' :
                             tx.transaction_type === 'stock_update' ? 'var(--color-info)' :
                             'var(--color-warning)'
                    }}>
                      {tx.transaction_type}
                    </span>
                  </td>
                  <td style={{
                    textAlign: 'center',
                    color: tx.quantity_change > 0 ? 'var(--color-primary)' : 'var(--color-danger)'
                  }}>
                    {tx.quantity_change > 0 ? '+' : ''}{tx.quantity_change}
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(tx.unit_cost_at_time || 0)}</td>
                  <td style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>{tx.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default InventoryMovementsSection;
