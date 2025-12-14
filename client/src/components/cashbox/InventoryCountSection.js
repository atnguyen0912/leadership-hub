import React from 'react';

function InventoryCountSection({
  inventoryItems,
  onSaveCount,
  onClearAll,
  setError,
  setSuccess,
  fetchInventory
}) {
  const activeItems = inventoryItems.filter(i => i.price !== null && i.active !== 0);

  const handleSaveCount = async () => {
    const counts = [];
    activeItems.forEach(item => {
      const inputEl = document.getElementById(`count-${item.id}`);
      if (inputEl && inputEl.value !== '') {
        counts.push({
          menuItemId: item.id,
          expectedQuantity: item.quantity_on_hand || 0,
          actualQuantity: parseInt(inputEl.value) || 0
        });
      }
    });

    if (counts.length === 0) {
      setError('Please enter at least one count');
      return;
    }

    try {
      const response = await fetch('/api/inventory/count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counts, countedBy: 'admin' })
      });
      const data = await response.json();
      if (response.ok) {
        const discrepancies = data.results.filter(r => r.discrepancy !== 0);
        setSuccess(`Count saved! ${counts.length} items counted, ${discrepancies.length} discrepancies recorded.`);
        fetchInventory();
        // Clear inputs
        inventoryItems.forEach(item => {
          const inputEl = document.getElementById(`count-${item.id}`);
          if (inputEl) inputEl.value = '';
        });
      } else {
        setError(data.error || 'Failed to save count');
      }
    } catch (err) {
      setError('Failed to save count: ' + err.message);
    }
  };

  const handleClearAll = () => {
    inventoryItems.forEach(item => {
      const inputEl = document.getElementById(`count-${item.id}`);
      if (inputEl) inputEl.value = '';
    });
  };

  return (
    <div>
      <h1 className="page-title">Inventory Count</h1>

      <div className="card" style={{ marginBottom: '16px' }}>
        <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px', marginBottom: '16px' }}>
          Enter actual quantities for each item. Discrepancies will be automatically recorded.
        </p>

        {activeItems.length === 0 ? (
          <p style={{ color: 'var(--color-text-subtle)', textAlign: 'center' }}>No inventory items to count.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{ textAlign: 'center' }}>Expected</th>
                  <th style={{ textAlign: 'center', width: '120px' }}>Actual Count</th>
                  <th style={{ textAlign: 'center' }}>Difference</th>
                </tr>
              </thead>
              <tbody>
                {activeItems.map(item => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{item.quantity_on_hand || 0}</td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        id={`count-${item.id}`}
                        type="number"
                        className="input"
                        min="0"
                        placeholder="—"
                        style={{ width: '80px', textAlign: 'center' }}
                        defaultValue=""
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={handleSaveCount}>
            Save Count
          </button>
          <button className="btn" onClick={handleClearAll}>
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}

export default InventoryCountSection;
