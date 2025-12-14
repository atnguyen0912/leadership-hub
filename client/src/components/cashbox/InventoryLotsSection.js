import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function InventoryLotsSection({
  inventoryItems,
  selectedInventoryItem,
  setSelectedInventoryItem,
  inventoryLots,
  onFetchLots
}) {
  return (
    <div className="card">
      <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-primary)' }}>
        Inventory Lot Tracking (FIFO)
      </h2>
      <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px', marginBottom: '16px' }}>
        View inventory lots by purchase date. Items are sold using First-In-First-Out costing.
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
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Purchase Date</th>
                <th style={{ textAlign: 'center' }}>Original Qty</th>
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
      )}

      {selectedInventoryItem && inventoryLots.length === 0 && (
        <p style={{ color: 'var(--color-text-subtle)', textAlign: 'center' }}>No lots found for this item.</p>
      )}
    </div>
  );
}

export default InventoryLotsSection;
