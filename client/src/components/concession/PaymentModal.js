import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function PaymentModal({
  show,
  onClose,
  isComp,
  subtotal,
  appliedDiscount,
  finalTotal,
  paymentMethod,
  setPaymentMethod,
  amountTendered,
  setAmountTendered,
  onComplete,
  submitting,
  error
}) {
  if (!show) return null;

  const calculateChange = () => {
    if (paymentMethod !== 'cash') return 0;
    const tendered = parseFloat(amountTendered) || 0;
    return Math.max(0, tendered - finalTotal);
  };

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>
          {isComp ? 'Complete Comp' : appliedDiscount > 0 ? 'Complete with Discount' : 'Payment'}
        </h3>

        <div style={{ background: 'var(--color-bg-input)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: appliedDiscount > 0 ? '8px' : 0 }}>
            <span style={{ color: 'var(--color-text-subtle)' }}>Subtotal:</span>
            <span style={{ color: 'var(--color-text-muted)' }}>
              {formatCurrency(subtotal)}
            </span>
          </div>
          {appliedDiscount > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: isComp ? '#9333ea' : 'var(--color-warning)' }}>
                  {isComp ? 'Comp' : 'Discount'}:
                </span>
                <span style={{ color: isComp ? '#9333ea' : 'var(--color-warning)' }}>
                  -{formatCurrency(appliedDiscount)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Total Due:</span>
                <span style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '20px' }}>
                  {formatCurrency(finalTotal)}
                </span>
              </div>
            </>
          )}
          {appliedDiscount === 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Total:</span>
              <span style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '20px' }}>
                {formatCurrency(subtotal)}
              </span>
            </div>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label>Payment Method</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`btn ${paymentMethod === 'cash' ? 'btn-primary' : ''}`}
              onClick={() => setPaymentMethod('cash')}
              style={{ flex: 1, padding: '12px' }}
            >
              Cash
            </button>
            <button
              type="button"
              className={`btn ${paymentMethod === 'cashapp' ? 'btn-primary' : ''}`}
              onClick={() => setPaymentMethod('cashapp')}
              style={{ flex: 1, padding: '12px', background: paymentMethod === 'cashapp' ? '#00D632' : undefined }}
            >
              CashApp
            </button>
            <button
              type="button"
              className={`btn ${paymentMethod === 'zelle' ? 'btn-primary' : ''}`}
              onClick={() => setPaymentMethod('zelle')}
              style={{ flex: 1, padding: '12px', background: paymentMethod === 'zelle' ? '#6B1CD1' : undefined }}
            >
              Zelle
            </button>
          </div>
        </div>

        {paymentMethod === 'cash' && (
          <div className="form-group">
            <label>Amount Tendered</label>
            <input
              type="number"
              className="input"
              step="0.01"
              min={finalTotal}
              value={amountTendered}
              onChange={(e) => setAmountTendered(e.target.value)}
              placeholder="0.00"
              style={{ fontSize: '24px', textAlign: 'center' }}
              autoFocus
            />
            {parseFloat(amountTendered) >= finalTotal && (
              <div style={{ marginTop: '8px', textAlign: 'center' }}>
                <span style={{ color: 'var(--color-text-subtle)' }}>Change: </span>
                <span style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '18px' }}>
                  {formatCurrency(calculateChange())}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
              {[1, 5, 10, 20].map(amt => (
                <button
                  key={amt}
                  type="button"
                  className="btn btn-small"
                  onClick={() => setAmountTendered(String(Math.ceil(finalTotal / amt) * amt))}
                  style={{ flex: 1 }}
                >
                  ${amt}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-small"
                onClick={() => setAmountTendered(String(finalTotal))}
                style={{ flex: 1 }}
              >
                Exact
              </button>
            </div>
          </div>
        )}

        {paymentMethod === 'cashapp' && (
          <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: '#00D632', fontSize: '14px', marginBottom: '8px' }}>
              Confirm customer sent CashApp payment
            </p>
            <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>
              Payment will be added to CashApp balance for withdrawal
            </p>
          </div>
        )}

        {paymentMethod === 'zelle' && (
          <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: '#6B1CD1', fontSize: '14px', marginBottom: '8px' }}>
              Confirm customer sent Zelle payment
            </p>
            <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>
              Zelle payments are auto-applied to reimbursement
            </p>
          </div>
        )}

        {error && <div className="error-message" style={{ marginTop: '12px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={onComplete}
            disabled={submitting || (paymentMethod === 'cash' && (parseFloat(amountTendered) || 0) < finalTotal)}
            style={{ flex: 2 }}
          >
            {submitting ? 'Processing...' : 'Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
