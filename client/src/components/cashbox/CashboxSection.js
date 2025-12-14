import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function CashboxSection({
  cashbox,
  editingCashbox,
  setEditingCashbox,
  editValues,
  setEditValues,
  onUpdateCashbox
}) {
  const handleChange = (field, value) => {
    setEditValues({ ...editValues, [field]: parseInt(value) || 0 });
  };

  return (
    <div>
      <h1 className="page-title">Main Cashbox</h1>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', color: 'var(--color-primary)' }}>Cash Denominations</h2>
          <button
            className="btn btn-small"
            onClick={() => setEditingCashbox(!editingCashbox)}
          >
            {editingCashbox ? 'Cancel' : 'Edit Counts'}
          </button>
        </div>

        {editingCashbox ? (
          <form onSubmit={onUpdateCashbox}>
            <div className="denomination-inputs">
              <div className="form-group">
                <label>Quarters</label>
                <input type="number" className="input" min="0" value={editValues.quarters} onChange={(e) => handleChange('quarters', e.target.value)} />
              </div>
              <div className="form-group">
                <label>$1 Bills</label>
                <input type="number" className="input" min="0" value={editValues.bills1} onChange={(e) => handleChange('bills1', e.target.value)} />
              </div>
              <div className="form-group">
                <label>$5 Bills</label>
                <input type="number" className="input" min="0" value={editValues.bills5} onChange={(e) => handleChange('bills5', e.target.value)} />
              </div>
              <div className="form-group">
                <label>$10 Bills</label>
                <input type="number" className="input" min="0" value={editValues.bills10} onChange={(e) => handleChange('bills10', e.target.value)} />
              </div>
              <div className="form-group">
                <label>$20 Bills</label>
                <input type="number" className="input" min="0" value={editValues.bills20} onChange={(e) => handleChange('bills20', e.target.value)} />
              </div>
              <div className="form-group">
                <label>$50 Bills</label>
                <input type="number" className="input" min="0" value={editValues.bills50} onChange={(e) => handleChange('bills50', e.target.value)} />
              </div>
              <div className="form-group">
                <label>$100 Bills</label>
                <input type="number" className="input" min="0" value={editValues.bills100} onChange={(e) => handleChange('bills100', e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Save Changes
            </button>
          </form>
        ) : (
          <>
            <div className="cashbox-totals">
              <div className="denomination-card">
                <div className="label">Quarters</div>
                <div className="count">{cashbox.quarters}</div>
                <div className="value">{formatCurrency(cashbox.quarters * 0.25)}</div>
              </div>
              <div className="denomination-card">
                <div className="label">$1 Bills</div>
                <div className="count">{cashbox.bills_1}</div>
                <div className="value">{formatCurrency(cashbox.bills_1)}</div>
              </div>
              <div className="denomination-card">
                <div className="label">$5 Bills</div>
                <div className="count">{cashbox.bills_5}</div>
                <div className="value">{formatCurrency(cashbox.bills_5 * 5)}</div>
              </div>
              <div className="denomination-card">
                <div className="label">$10 Bills</div>
                <div className="count">{cashbox.bills_10}</div>
                <div className="value">{formatCurrency(cashbox.bills_10 * 10)}</div>
              </div>
              <div className="denomination-card">
                <div className="label">$20 Bills</div>
                <div className="count">{cashbox.bills_20}</div>
                <div className="value">{formatCurrency(cashbox.bills_20 * 20)}</div>
              </div>
              <div className="denomination-card">
                <div className="label">$50 Bills</div>
                <div className="count">{cashbox.bills_50}</div>
                <div className="value">{formatCurrency(cashbox.bills_50 * 50)}</div>
              </div>
              <div className="denomination-card">
                <div className="label">$100 Bills</div>
                <div className="count">{cashbox.bills_100}</div>
                <div className="value">{formatCurrency(cashbox.bills_100 * 100)}</div>
              </div>
            </div>
            <div className="cashbox-total">
              Total: {formatCurrency(cashbox.totalValue)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CashboxSection;
