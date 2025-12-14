import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function ReimbursementSection({
  loadingReimbursement,
  reimbursementData,
  reimbursementLedger
}) {
  return (
    <div>
      <h1 className="page-title">Reimbursement Tracking</h1>

      {loadingReimbursement ? (
        <div className="card"><p style={{ color: 'var(--color-text-subtle)', textAlign: 'center' }}>Loading reimbursement data...</p></div>
      ) : reimbursementData && (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid var(--color-info)' }}>
              <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px', margin: '0 0 4px 0' }}>Total COGS (Reimbursable)</p>
              <p style={{ color: 'var(--color-info)', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                {formatCurrency(reimbursementData.totalCogsOwed)}
              </p>
            </div>
            <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid var(--color-danger)' }}>
              <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px', margin: '0 0 4px 0' }}>ASB Losses (Deducted)</p>
              <p style={{ color: 'var(--color-danger)', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                -{formatCurrency(reimbursementData.asbLosses)}
              </p>
            </div>
            <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid var(--color-primary)' }}>
              <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px', margin: '0 0 4px 0' }}>Gross Owed</p>
              <p style={{ color: 'var(--color-primary)', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                {formatCurrency(reimbursementData.grossOwed)}
              </p>
            </div>
          </div>

          {/* Received Breakdown */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--color-primary)' }}>
              Amounts Received
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'rgba(107, 28, 209, 0.13)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-primary)', fontSize: '11px', margin: '0 0 4px 0' }}>Zelle Received</p>
                <p style={{ color: 'var(--color-primary)', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                  {formatCurrency(reimbursementData.zelleReceived)}
                </p>
              </div>
              <div style={{ background: 'rgba(0, 214, 50, 0.13)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-primary)', fontSize: '11px', margin: '0 0 4px 0' }}>CashApp Withdrawn</p>
                <p style={{ color: 'var(--color-primary)', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                  {formatCurrency(reimbursementData.cashappWithdrawn)}
                </p>
              </div>
              <div style={{ background: 'rgba(34, 197, 94, 0.13)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-primary)', fontSize: '11px', margin: '0 0 4px 0' }}>Cashbox Reimbursed</p>
                <p style={{ color: 'var(--color-primary)', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                  {formatCurrency(reimbursementData.cashboxReimbursed)}
                </p>
              </div>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--color-bg-input)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-subtle)' }}>Total Received:</span>
              <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{formatCurrency(reimbursementData.totalReceived)}</span>
            </div>
          </div>

          {/* Remaining */}
          <div className="card" style={{
            marginBottom: '16px',
            background: reimbursementData.remaining > 0 ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.07), rgba(234, 179, 8, 0.13))' : 'linear-gradient(135deg, rgba(34, 197, 94, 0.07), rgba(34, 197, 94, 0.13))',
            borderLeft: `4px solid ${reimbursementData.remaining > 0 ? 'var(--color-warning)' : 'var(--color-primary)'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', color: reimbursementData.remaining > 0 ? 'var(--color-warning)' : 'var(--color-primary)' }}>
                  {reimbursementData.remaining > 0 ? 'Remaining to Collect' : 'Fully Reimbursed'}
                </h2>
                <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-subtle)', fontSize: '13px' }}>
                  {reimbursementData.remaining > 0 ? 'Outstanding balance to be collected from ASB' : 'All reimbursable costs have been recovered'}
                </p>
              </div>
              <p style={{ color: reimbursementData.remaining > 0 ? 'var(--color-warning)' : 'var(--color-primary)', fontSize: '32px', fontWeight: 'bold', margin: 0 }}>
                {formatCurrency(Math.abs(reimbursementData.remaining))}
              </p>
            </div>
          </div>

          {/* Ledger History */}
          {reimbursementLedger.length > 0 && (
            <div className="card">
              <h2 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--color-primary)' }}>
                Recent Ledger Entries
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Session</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reimbursementLedger.map(entry => (
                      <tr key={entry.id}>
                        <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {new Date(entry.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            background: entry.entry_type.includes('received') || entry.entry_type.includes('withdrawal') || entry.entry_type.includes('reimbursement') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                            color: entry.entry_type.includes('received') || entry.entry_type.includes('withdrawal') || entry.entry_type.includes('reimbursement') ? 'var(--color-primary)' : 'var(--color-info)'
                          }}>
                            {entry.entry_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>{entry.session_name || '—'}</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-primary)' }}>{formatCurrency(entry.amount)}</td>
                        <td style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>{entry.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ReimbursementSection;
