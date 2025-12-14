import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function OrderHistoryModal({
  show,
  onClose,
  orders,
  loading
}) {
  if (!show) return null;

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ color: '#3b82f6', margin: 0 }}>Order History</h3>
          <button
            className="btn btn-small"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-subtle)' }}>Loading orders...</p>
        ) : orders.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-subtle)' }}>No orders yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orders.map(order => (
              <div
                key={order.id}
                style={{
                  background: 'var(--color-bg-input)',
                  padding: '12px',
                  borderRadius: '8px',
                  borderLeft: order.is_comp ? '3px solid var(--color-warning)' : order.discount_amount > 0 ? '3px solid #f97316' : '3px solid var(--color-primary)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-subtle)', fontSize: '11px' }}>
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span style={{
                      marginLeft: '8px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      background: order.payment_method === 'cash' ? 'rgba(34, 197, 94, 0.2)' :
                                 order.payment_method === 'cashapp' ? 'rgba(0, 214, 50, 0.2)' : 'rgba(107, 28, 209, 0.2)',
                      color: order.payment_method === 'cash' ? 'var(--color-primary)' :
                             order.payment_method === 'cashapp' ? '#00D632' : '#a855f7'
                    }}>
                      {order.payment_method === 'cashapp' ? 'CashApp' : order.payment_method === 'zelle' ? 'Zelle' : 'Cash'}
                    </span>
                    {order.is_comp ? (
                      <span style={{ marginLeft: '4px', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', background: 'rgba(234, 179, 8, 0.2)', color: 'var(--color-warning)' }}>
                        COMP
                      </span>
                    ) : null}
                  </div>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '16px' }}>
                    {formatCurrency(order.final_total || order.subtotal)}
                  </span>
                </div>

                <p style={{ color: 'var(--color-text)', fontSize: '13px', marginBottom: '4px' }}>
                  {order.items_summary || 'Items not available'}
                </p>

                {order.discount_amount > 0 && !order.is_comp && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#f97316', marginTop: '4px' }}>
                    <span>Discount{order.discount_reason ? `: ${order.discount_reason}` : ''}</span>
                    <span>-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}

                {order.payment_method === 'cash' && order.change_given > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>
                    Paid: {formatCurrency(order.amount_tendered)} | Change: {formatCurrency(order.change_given)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '16px', padding: '12px', background: 'var(--color-bg-input)', borderRadius: '8px', textAlign: 'center' }}>
          <span style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>
            Total: {orders.length} orders | {formatCurrency(orders.reduce((sum, o) => sum + (o.final_total || o.subtotal), 0))}
          </span>
        </div>
      </div>
    </div>
  );
}

export default OrderHistoryModal;
