import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function DiscountModal({
  show,
  onClose,
  isComp,
  orderTotal,
  discountAmount,
  setDiscountAmount,
  discountChargedTo,
  setDiscountChargedTo,
  discountReason,
  setDiscountReason,
  onApply,
  session,
  programs,
  error
}) {
  if (!show) return null;

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <h3 style={{ color: isComp ? '#9333ea' : '#eab308', marginBottom: '16px' }}>
          {isComp ? 'Comp Order' : 'Apply Discount'}
        </h3>

        <div style={{ background: 'var(--color-bg-input)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-subtle)' }}>Order Total:</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>
              {formatCurrency(orderTotal)}
            </span>
          </div>
        </div>

        <div className="form-group">
          <label>{isComp ? 'Comp Amount' : 'Discount Amount'}</label>
          <input
            type="number"
            className="input"
            step="0.01"
            min="0.01"
            max={orderTotal}
            value={discountAmount}
            onChange={(e) => setDiscountAmount(e.target.value)}
            placeholder="0.00"
            style={{ fontSize: '20px', textAlign: 'center' }}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label>Charge To</label>
          <select
            className="input"
            value={discountChargedTo}
            onChange={(e) => setDiscountChargedTo(e.target.value)}
          >
            <option value="asb">ASB (Loss)</option>
            <option value="program">This Program ({session?.program_name || 'Current'})</option>
            {programs.filter(p => p.id !== session?.program_id).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Reason</label>
          <input
            type="text"
            className="input"
            value={discountReason}
            onChange={(e) => setDiscountReason(e.target.value)}
            placeholder={isComp ? 'e.g., Staff appreciation' : 'e.g., Coupon, loyalty'}
          />
        </div>

        {error && <div className="error-message" style={{ marginBottom: '12px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '8px' }}>
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
            onClick={onApply}
            disabled={(parseFloat(discountAmount) || 0) <= 0}
            style={{ flex: 1, background: isComp ? '#9333ea' : '#eab308' }}
          >
            Apply {isComp ? 'Comp' : 'Discount'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DiscountModal;
