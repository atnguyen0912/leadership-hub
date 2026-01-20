import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters';

function SessionCloseModal({ isOpen, onClose, sessionId, onSessionClosed }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actualCashCount, setActualCashCount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch preview data when modal opens
  useEffect(() => {
    if (isOpen && sessionId) {
      fetchPreview();
    } else {
      // Reset state when modal closes
      setPreview(null);
      setActualCashCount('');
      setError('');
    }
  }, [isOpen, sessionId]);

  const fetchPreview = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/cashbox/sessions/${sessionId}/close-preview`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch preview');
      }
      const data = await response.json();
      setPreview(data);
      // Pre-fill with expected cash amount
      setActualCashCount(String(data.expectedCashInDrawer || 0));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!actualCashCount || isNaN(actualCashCount)) {
      setError('Please enter a valid cash count');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/sessions/${sessionId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actualCashCount: parseFloat(actualCashCount),
          closedBy: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).studentId : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to close session');
      }

      const data = await response.json();

      // Call the callback with the response data
      if (onSessionClosed) {
        onSessionClosed(data);
      }

      // Close the modal
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div
        className="pos-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>
          Close Session: {preview?.sessionName || 'Loading...'}
        </h3>

        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '48px 32px',
            color: 'var(--color-text-subtle)',
            background: 'var(--color-bg-input)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)'
          }}>
            <div style={{
              fontSize: '16px',
              color: 'var(--color-primary)',
              fontWeight: '500'
            }}>
              Loading session data...
            </div>
            <div style={{
              marginTop: '16px',
              color: 'var(--color-text-subtle)',
              fontSize: '13px'
            }}>
              Calculating revenue, costs, and profit
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>
        )}

        {preview && !loading && (
          <>
            {/* Sales Summary Section */}
            <div style={{
              background: 'var(--color-bg-input)',
              padding: '14px',
              borderRadius: '8px',
              marginBottom: '12px',
              border: '1px solid var(--color-border)'
            }}>
              <h4 style={{
                color: 'var(--color-primary)',
                marginBottom: '12px',
                fontSize: '15px',
                fontWeight: '600'
              }}>
                SALES SUMMARY
              </h4>
              <div style={{ paddingLeft: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-subtle)', fontSize: '13px' }}>
                    Total Orders
                  </span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: '500' }}>
                    {preview.revenue.orderCount}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-subtle)', fontSize: '13px' }}>
                    Total Revenue
                  </span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '14px' }}>
                    {formatCurrency(preview.revenue.total)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-subtle)', fontSize: '13px' }}>
                    Average Order
                  </span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: '500' }}>
                    {preview.revenue.orderCount > 0
                      ? formatCurrency(preview.revenue.total / preview.revenue.orderCount)
                      : formatCurrency(0)
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Breakdown Section */}
            <div style={{
              background: 'var(--color-bg-input)',
              padding: '14px',
              borderRadius: '8px',
              marginBottom: '12px',
              border: '1px solid var(--color-border)'
            }}>
              <h4 style={{
                color: 'var(--color-primary)',
                marginBottom: '12px',
                fontSize: '15px',
                fontWeight: '600'
              }}>
                PAYMENT BREAKDOWN
              </h4>
              <div style={{ paddingLeft: '4px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  alignItems: 'center'
                }}>
                  <span style={{ color: 'var(--color-text-subtle)', fontSize: '13px' }}>
                    ├─ Cash
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      color: 'var(--color-text-subtle)',
                      fontSize: '11px',
                      minWidth: '45px',
                      textAlign: 'right'
                    }}>
                      {preview.revenue.total > 0
                        ? `(${((preview.revenue.cash / preview.revenue.total) * 100).toFixed(1)}%)`
                        : '(0.0%)'
                      }
                    </span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: '500' }}>
                      {formatCurrency(preview.revenue.cash)}
                    </span>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  alignItems: 'center'
                }}>
                  <span style={{ color: 'var(--color-text-subtle)', fontSize: '13px' }}>
                    ├─ CashApp
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      color: 'var(--color-text-subtle)',
                      fontSize: '11px',
                      minWidth: '45px',
                      textAlign: 'right'
                    }}>
                      {preview.revenue.total > 0
                        ? `(${((preview.revenue.cashapp / preview.revenue.total) * 100).toFixed(1)}%)`
                        : '(0.0%)'
                      }
                    </span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: '500' }}>
                      {formatCurrency(preview.revenue.cashapp)}
                    </span>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: 'var(--color-text-subtle)', fontSize: '13px' }}>
                    └─ Zelle
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      color: 'var(--color-text-subtle)',
                      fontSize: '11px',
                      minWidth: '45px',
                      textAlign: 'right'
                    }}>
                      {preview.revenue.total > 0
                        ? `(${((preview.revenue.zelle / preview.revenue.total) * 100).toFixed(1)}%)`
                        : '(0.0%)'
                      }
                    </span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: '500' }}>
                      {formatCurrency(preview.revenue.zelle)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Costs & Profit Section */}
            <div style={{
              background: 'var(--color-bg-input)',
              padding: '14px',
              borderRadius: '8px',
              marginBottom: '12px',
              border: '1px solid var(--color-border)'
            }}>
              <h4 style={{
                color: 'var(--color-primary)',
                marginBottom: '12px',
                fontSize: '15px',
                fontWeight: '600'
              }}>
                COSTS & PROFIT
              </h4>
              <div style={{ paddingLeft: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-subtle)', fontSize: '13px' }}>
                    Total COGS
                  </span>
                  <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: '500' }}>
                    {formatCurrency(preview.costs.totalCogs)}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: '8px',
                  marginTop: '8px'
                }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>
                    Gross Profit
                  </span>
                  <span style={{
                    color: preview.profit >= 0 ? '#22c55e' : '#ef4444',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    {formatCurrency(preview.profit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Reimbursement Section */}
            <div style={{
              background: 'var(--color-bg-input)',
              padding: '14px',
              borderRadius: '8px',
              marginBottom: '12px',
              border: '1px solid var(--color-border)'
            }}>
              <h4 style={{
                color: 'var(--color-primary)',
                marginBottom: '12px',
                fontSize: '15px',
                fontWeight: '600'
              }}>
                REIMBURSEMENT CALCULATION
              </h4>
              <div style={{ paddingLeft: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--color-text-subtle)', fontSize: '13px' }}>
                    Alex is owed (COGS)
                  </span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: '500' }}>
                    {formatCurrency(preview.reimbursement.totalOwed)}
                  </span>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <div style={{ color: 'var(--color-text-subtle)', fontSize: '13px', marginBottom: '6px' }}>
                    Already reimbursed:
                  </div>
                  <div style={{ paddingLeft: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>
                        ├─ CashApp
                      </span>
                      <span style={{ color: '#00D632', fontSize: '12px', fontWeight: '500' }}>
                        {formatCurrency(preview.reimbursement.autoReimbursed.cashapp)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>
                        ├─ Zelle
                      </span>
                      <span style={{ color: '#6B1CD1', fontSize: '12px', fontWeight: '500' }}>
                        {formatCurrency(preview.reimbursement.autoReimbursed.zelle)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>
                        └─ Total
                      </span>
                      <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: '500' }}>
                        {formatCurrency(preview.reimbursement.autoReimbursed.total)}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: '8px',
                  marginTop: '8px'
                }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>
                    Still owed
                  </span>
                  <span style={{
                    color: preview.reimbursement.stillOwed > 0 ? '#f59e0b' : '#22c55e',
                    fontWeight: 'bold',
                    fontSize: '15px'
                  }}>
                    {formatCurrency(preview.reimbursement.stillOwed)}
                  </span>
                </div>
              </div>
            </div>

            {/* Profit Allocation Section */}
            <div style={{
              background: 'var(--color-bg-input)',
              padding: '14px',
              borderRadius: '8px',
              marginBottom: '12px',
              border: '1px solid var(--color-border)'
            }}>
              <h4 style={{
                color: 'var(--color-primary)',
                marginBottom: '12px',
                fontSize: '15px',
                fontWeight: '600'
              }}>
                PROFIT ALLOCATION
              </h4>
              <div style={{ paddingLeft: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-subtle)', fontSize: '13px' }}>
                    To {preview.programName}
                  </span>
                  <span style={{
                    color: preview.profit >= 0 ? '#22c55e' : '#ef4444',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    {formatCurrency(preview.profit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cash Reconciliation Section */}
            <div style={{
              background: 'var(--color-bg-input)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <h4 style={{ color: 'var(--color-primary)', marginBottom: '8px', fontSize: '14px' }}>
                Cash Reconciliation
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--color-text-subtle)', fontSize: '13px' }}>Starting Cash:</span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
                  {formatCurrency(preview.startingCash.total)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--color-text-subtle)', fontSize: '13px' }}>+ Cash Sales:</span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
                  {formatCurrency(preview.revenue.cash)}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--color-border)',
                paddingTop: '8px',
                marginBottom: '12px'
              }}>
                <span style={{ color: 'var(--color-text-subtle)', fontSize: '13px' }}>Expected in Drawer:</span>
                <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>
                  {formatCurrency(preview.expectedCashInDrawer)}
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '0' }}>
                <label style={{ fontSize: '13px', marginBottom: '6px' }}>Actual Cash Count</label>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  min="0"
                  value={actualCashCount}
                  onChange={(e) => setActualCashCount(e.target.value)}
                  placeholder="0.00"
                  style={{ fontSize: '20px', textAlign: 'center' }}
                  autoFocus
                />
                {actualCashCount && !isNaN(actualCashCount) && (
                  <div style={{
                    marginTop: '8px',
                    textAlign: 'center',
                    padding: '8px',
                    background: Math.abs(parseFloat(actualCashCount) - preview.expectedCashInDrawer) > 0.01
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '4px'
                  }}>
                    <span style={{ color: 'var(--color-text-subtle)', fontSize: '13px' }}>
                      Discrepancy:{' '}
                    </span>
                    <span style={{
                      color: Math.abs(parseFloat(actualCashCount) - preview.expectedCashInDrawer) > 0.01
                        ? '#ef4444'
                        : '#22c55e',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>
                      {formatCurrency(parseFloat(actualCashCount) - preview.expectedCashInDrawer)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn"
                onClick={onClose}
                disabled={submitting}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleClose}
                disabled={submitting || !actualCashCount || isNaN(actualCashCount)}
                style={{ flex: 2, background: '#22c55e' }}
              >
                {submitting ? 'Closing...' : 'Close Session'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SessionCloseModal;
