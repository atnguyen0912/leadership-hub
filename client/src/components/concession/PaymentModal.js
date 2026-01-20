import React, { useState, useEffect } from 'react';
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
  error,
  session,
  discountChargedTo,
  setDiscountChargedTo
}) {
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    if (show && appliedDiscount > 0) {
      fetchPrograms();
    }
  }, [show, appliedDiscount]);

  const fetchPrograms = async () => {
    try {
      const response = await fetch('/api/cashbox/programs');
      const data = await response.json();
      if (response.ok) {
        // Filter to only active programs
        setPrograms(data.filter(p => p.active));
      }
    } catch (err) {
      console.error('Failed to fetch programs:', err);
    }
  };

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

        {appliedDiscount > 0 && (
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>{isComp ? 'Charge Comp To' : 'Charge Discount To'}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${discountChargedTo === null || discountChargedTo === 'asb' ? 'btn-primary' : ''}`}
                onClick={() => setDiscountChargedTo('asb')}
                style={{ padding: '10px', textAlign: 'left' }}
              >
                <div style={{ fontWeight: 'bold' }}>ASB</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                  ASB absorbs the cost
                </div>
              </button>

              {session && (
                <button
                  type="button"
                  className={`btn ${discountChargedTo === 'program' ? 'btn-primary' : ''}`}
                  onClick={() => setDiscountChargedTo('program')}
                  style={{ padding: '10px', textAlign: 'left' }}
                >
                  <div style={{ fontWeight: 'bold' }}>This Program ({session.program_name})</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                    Charge to current session's program
                  </div>
                </button>
              )}

              {programs.filter(p => p.id !== session?.program_id).map(program => (
                <button
                  key={program.id}
                  type="button"
                  className={`btn ${discountChargedTo === program.id ? 'btn-primary' : ''}`}
                  onClick={() => setDiscountChargedTo(program.id)}
                  style={{ padding: '10px', textAlign: 'left' }}
                >
                  <div style={{ fontWeight: 'bold' }}>{program.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                    Charge to {program.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Only show payment methods if there's an actual amount to pay */}
        {finalTotal > 0 && (
          <>
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
          </>
        )}

        {/* Show message for comps/100% discount */}
        {finalTotal === 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #9333ea22, #7c3aed22)',
            border: '1px solid #9333ea',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            <p style={{ color: '#9333ea', fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
              No Payment Required
            </p>
            <p style={{ color: 'var(--color-text-subtle)', fontSize: '14px' }}>
              This order is fully comped
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
            disabled={submitting || (finalTotal > 0 && paymentMethod === 'cash' && (parseFloat(amountTendered) || 0) < finalTotal)}
            style={{ flex: 2 }}
          >
            {submitting ? 'Processing...' : (finalTotal === 0 ? 'Complete Comp' : 'Complete')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
