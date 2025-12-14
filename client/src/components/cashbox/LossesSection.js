import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function getLossTypeLabel(type) {
  const labels = {
    spoilage: 'Spoilage',
    cash_discrepancy: 'Cash Discrepancy',
    inventory_discrepancy: 'Inventory Discrepancy',
    other: 'Other'
  };
  return labels[type] || type;
}

function LossesSection({
  losses,
  lossesSummary,
  showAddLossForm,
  setShowAddLossForm,
  lossFormData,
  setLossFormData,
  sessions,
  programs,
  onAddLoss,
  onDeleteLoss
}) {
  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', color: 'var(--color-primary)', margin: 0 }}>
            Loss Tracking
          </h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddLossForm(true)}
          >
            + Record Loss
          </button>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px', marginBottom: '4px' }}>Total Losses</p>
            <p style={{ color: 'var(--color-danger)', fontSize: '24px', fontWeight: 'bold' }}>
              {formatCurrency(lossesSummary.totals?.total_amount || 0)}
            </p>
            <p style={{ color: 'var(--color-text-subtle)', fontSize: '11px' }}>
              {lossesSummary.totals?.total_count || 0} records
            </p>
          </div>
          {lossesSummary.byType?.map(item => (
            <div key={item.loss_type} style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px', marginBottom: '4px' }}>{getLossTypeLabel(item.loss_type)}</p>
              <p style={{ color: 'var(--color-warning)', fontSize: '20px', fontWeight: 'bold' }}>
                {formatCurrency(item.total_amount)}
              </p>
              <p style={{ color: 'var(--color-text-subtle)', fontSize: '11px' }}>
                {item.count} records
              </p>
            </div>
          ))}
        </div>

        {/* Loss Records Table */}
        {losses.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No losses recorded.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Session/Program</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {losses.map(loss => (
                  <tr key={loss.id}>
                    <td>{new Date(loss.created_at).toLocaleDateString()}</td>
                    <td>
                      <span style={{
                        background: loss.loss_type === 'cash_discrepancy' ? 'rgba(239, 68, 68, 0.2)' :
                                   loss.loss_type === 'inventory_discrepancy' ? 'rgba(249, 115, 22, 0.2)' :
                                   loss.loss_type === 'spoilage' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                        color: loss.loss_type === 'cash_discrepancy' ? 'var(--color-danger)' :
                               loss.loss_type === 'inventory_discrepancy' ? 'var(--color-warning)' :
                               loss.loss_type === 'spoilage' ? 'var(--color-warning)' : 'var(--color-text-muted)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {getLossTypeLabel(loss.loss_type)}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{formatCurrency(loss.amount)}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {loss.description || '-'}
                    </td>
                    <td>
                      {loss.session_start ? new Date(loss.session_start).toLocaleDateString() : ''}
                      {loss.program_name ? ` (${loss.program_name})` : ''}
                      {!loss.session_start && !loss.program_name && '-'}
                    </td>
                    <td>
                      <button
                        className="btn btn-small"
                        onClick={() => onDeleteLoss(loss.id)}
                        style={{ background: 'var(--color-danger)', color: 'var(--color-text)', padding: '4px 8px' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Loss Modal */}
      {showAddLossForm && (
        <div className="pos-modal-overlay" onClick={() => setShowAddLossForm(false)}>
          <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3 style={{ color: 'var(--color-danger)', marginBottom: '16px' }}>Record Loss</h3>

            <form onSubmit={onAddLoss}>
              <div className="form-group">
                <label>Loss Type *</label>
                <select
                  className="input"
                  value={lossFormData.lossType}
                  onChange={(e) => setLossFormData({ ...lossFormData, lossType: e.target.value })}
                  required
                >
                  <option value="spoilage">Spoilage</option>
                  <option value="cash_discrepancy">Cash Discrepancy</option>
                  <option value="inventory_discrepancy">Inventory Discrepancy</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Amount ($) *</label>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  min="0.01"
                  value={lossFormData.amount}
                  onChange={(e) => setLossFormData({ ...lossFormData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  className="input"
                  value={lossFormData.description}
                  onChange={(e) => setLossFormData({ ...lossFormData, description: e.target.value })}
                  placeholder="What happened?"
                />
              </div>

              <div className="form-group">
                <label>Related Session (optional)</label>
                <select
                  className="input"
                  value={lossFormData.sessionId}
                  onChange={(e) => setLossFormData({ ...lossFormData, sessionId: e.target.value })}
                >
                  <option value="">-- None --</option>
                  {sessions.filter(s => s.status === 'closed').map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {new Date(s.start_time).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Charged To Program (optional)</label>
                <select
                  className="input"
                  value={lossFormData.programId}
                  onChange={(e) => setLossFormData({ ...lossFormData, programId: e.target.value })}
                >
                  <option value="">-- ASB (General) --</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button type="button" className="btn" onClick={() => setShowAddLossForm(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'var(--color-danger)' }}>
                  Record Loss
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default LossesSection;
