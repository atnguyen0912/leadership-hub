import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function DashboardSection({
  cashbox,
  sessions,
  cashAppBalance,
  inventoryItems,
  onNavigate,
  onOpenPOS,
  onOpenVerification
}) {
  const activeSessions = sessions.filter(s => s.status === 'active');
  const lowStockItems = inventoryItems.filter(i => i.quantity_on_hand <= 5 && i.quantity_on_hand > 0);

  // Calculate verification summary
  const verificationSummary = inventoryItems.reduce((acc, item) => {
    if (!item.active || !item.track_inventory) return acc;
    const status = item.inventory_confidence || 'never';
    acc[status] = (acc[status] || 0) + 1;
    acc.total += 1;
    return acc;
  }, { verified: 0, estimated: 0, stale: 0, never: 0, total: 0 });

  const needsVerification = verificationSummary.stale + verificationSummary.never;

  return (
    <div>
      <h1 className="page-title">Concessions Dashboard</h1>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px', margin: '0 0 4px 0' }}>Main Cashbox</p>
          <p style={{ color: 'var(--color-primary)', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            {formatCurrency(cashbox?.totalValue || 0)}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px', margin: '0 0 4px 0' }}>Active Sessions</p>
          <p style={{ color: 'var(--color-primary)', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            {activeSessions.length}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px', margin: '0 0 4px 0' }}>CashApp Balance</p>
          <p style={{ color: 'var(--color-primary)', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            {formatCurrency(cashAppBalance)}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px', margin: '0 0 4px 0' }}>Low Stock Items</p>
          <p style={{ color: lowStockItems.length > 0 ? 'var(--color-warning)' : 'var(--color-primary)', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            {lowStockItems.length}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px', margin: '0 0 4px 0' }}>Inventory Status</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '4px' }}>
            <span title="Verified (checked within 7 days)" style={{ fontSize: '14px' }}>🟢 {verificationSummary.verified}</span>
            <span title="Estimated (checked 7-14 days ago)" style={{ fontSize: '14px' }}>🟡 {verificationSummary.estimated}</span>
            <span title="Stale or never verified" style={{ fontSize: '14px', color: needsVerification > 0 ? 'var(--color-danger)' : 'inherit' }}>
              🔴 {needsVerification}
            </span>
          </div>
          {needsVerification > 0 && (
            <p style={{ color: 'var(--color-danger)', fontSize: '11px', margin: 0 }}>
              {needsVerification} item{needsVerification !== 1 ? 's' : ''} need{needsVerification === 1 ? 's' : ''} verification
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 style={{ color: 'var(--color-primary)', fontSize: '16px', marginBottom: '16px' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => onNavigate('sessions', 'active')}>
            New Session
          </button>
          <button className="btn" onClick={() => onNavigate('purchases', 'new')}>
            Enter Purchase
          </button>
          <button className="btn" onClick={() => onNavigate('inventory', 'count')}>
            Inventory Count
          </button>
          {onOpenVerification && (
            <button
              className="btn"
              onClick={onOpenVerification}
              style={needsVerification > 0 ? { background: 'var(--color-warning)' } : {}}
            >
              {needsVerification > 0 ? `📋 Verify (${needsVerification})` : '📋 Verify Inventory'}
            </button>
          )}
          <button className="btn" onClick={() => onNavigate('reports')}>
            View Reports
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="card" style={{ marginTop: '16px' }}>
          <h2 style={{ color: 'var(--color-primary)', fontSize: '16px', marginBottom: '16px' }}>Active Sessions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeSessions.map(session => (
              <div key={session.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--color-bg-input)',
                padding: '12px',
                borderRadius: '8px'
              }}>
                <div>
                  <p style={{ color: 'var(--color-primary)', margin: 0, fontWeight: 'bold' }}>{session.name}</p>
                  <p style={{ color: 'var(--color-text-subtle)', margin: 0, fontSize: '12px' }}>{session.program_name}</p>
                </div>
                <button
                  className="btn btn-small btn-primary"
                  onClick={() => onOpenPOS(session.id)}
                >
                  Open POS
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="card" style={{ marginTop: '16px', borderLeft: '4px solid var(--color-warning)' }}>
          <h2 style={{ color: 'var(--color-warning)', fontSize: '16px', marginBottom: '12px' }}>Low Stock Alert</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {lowStockItems.map(item => (
              <span key={item.id} style={{
                background: 'rgba(234, 179, 8, 0.13)',
                color: 'var(--color-warning)',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '13px'
              }}>
                {item.name}: {item.quantity_on_hand} left
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardSection;
