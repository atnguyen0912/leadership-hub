import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function CashAppSection({
  cashAppBalance,
  showWithdrawModal,
  setShowWithdrawModal,
  withdrawAmount,
  setWithdrawAmount,
  onWithdraw
}) {
  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-primary)' }}>
          Digital Payments
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {/* CashApp Balance Card */}
          <div style={{ background: 'var(--color-primary)', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: 'var(--color-bg)', fontSize: '14px', marginBottom: '4px', fontWeight: 'normal' }}>
              CashApp Balance
            </h3>
            <p style={{ color: 'var(--color-bg)', fontSize: '28px', fontWeight: 'bold', marginBottom: '12px' }}>
              {formatCurrency(cashAppBalance)}
            </p>
            {cashAppBalance > 0 && (
              <button
                className="btn"
                onClick={() => setShowWithdrawModal(true)}
                style={{ background: 'var(--color-bg)', color: 'var(--color-primary)', padding: '8px 16px' }}
              >
                Withdraw
              </button>
            )}
          </div>

          {/* Zelle Info Card */}
          <div style={{ background: 'rgb(107, 28, 209)', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: 'var(--color-text)', fontSize: '14px', marginBottom: '4px', fontWeight: 'normal' }}>
              Zelle Payments
            </h3>
            <p style={{ color: 'var(--color-text)', fontSize: '14px', marginBottom: '8px' }}>
              Zelle payments go directly to your bank account
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
              Auto-applied to reimbursement
            </p>
          </div>
        </div>

        <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px' }}>
          <h3 style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '12px' }}>How Digital Payments Work</h3>
          <ul style={{ color: 'var(--color-text-subtle)', fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px' }}>
            <li><strong style={{ color: 'var(--color-primary)' }}>CashApp</strong>: Payments accumulate in your CashApp balance. Withdraw when needed for reimbursement.</li>
            <li><strong style={{ color: 'rgb(107, 28, 209)' }}>Zelle</strong>: Goes directly to your bank - automatically applied to what ASB owes you.</li>
            <li><strong style={{ color: 'var(--color-text-muted)' }}>Cash</strong>: Stays in the session drawer, then goes to the main cashbox.</li>
          </ul>
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="pos-modal-overlay" onClick={() => setShowWithdrawModal(false)}>
          <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: '16px' }}>Withdraw from CashApp</h3>

            <div style={{ background: 'var(--color-bg-input)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-subtle)' }}>Available Balance:</span>
                <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{formatCurrency(cashAppBalance)}</span>
              </div>
            </div>

            <form onSubmit={onWithdraw}>
              <div className="form-group">
                <label>Amount to Withdraw</label>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  min="0.01"
                  max={cashAppBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ fontSize: '20px', textAlign: 'center' }}
                  autoFocus
                />
              </div>

              <button
                type="button"
                className="btn btn-small"
                onClick={() => setWithdrawAmount(String(cashAppBalance))}
                style={{ marginBottom: '16px', width: '100%' }}
              >
                Withdraw All ({formatCurrency(cashAppBalance)})
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn" onClick={() => setShowWithdrawModal(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={(parseFloat(withdrawAmount) || 0) <= 0 || (parseFloat(withdrawAmount) || 0) > cashAppBalance}
                  style={{ flex: 1, background: 'var(--color-primary)' }}
                >
                  Withdraw
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default CashAppSection;
