import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function ReportsSection({
  reportStartDate,
  setReportStartDate,
  reportEndDate,
  setReportEndDate,
  reportSummary,
  loadingReport,
  onFetchReport,
  onClearFilters,
  onDownloadReport
}) {
  return (
    <div className="card">
      <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-primary)' }}>
        Reports & Exports
      </h2>

      {/* Date Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Start Date</label>
          <input
            type="date"
            className="input"
            value={reportStartDate}
            onChange={(e) => setReportStartDate(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>End Date</label>
          <input
            type="date"
            className="input"
            value={reportEndDate}
            onChange={(e) => setReportEndDate(e.target.value)}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={onFetchReport}
          disabled={loadingReport}
        >
          {loadingReport ? 'Loading...' : 'Update Summary'}
        </button>
        <button
          className="btn"
          onClick={onClearFilters}
        >
          Clear Filters
        </button>
      </div>

      {/* Summary Cards */}
      {reportSummary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px' }}>
            <h3 style={{ color: 'var(--color-text-subtle)', fontSize: '12px', marginBottom: '8px' }}>Sessions</h3>
            <p style={{ color: 'var(--color-primary)', fontSize: '24px', fontWeight: 'bold' }}>{reportSummary.sessions?.closed_sessions || 0}</p>
            <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>Total Profit: {formatCurrency(reportSummary.sessions?.total_profit || 0)}</p>
          </div>
          <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px' }}>
            <h3 style={{ color: 'var(--color-text-subtle)', fontSize: '12px', marginBottom: '8px' }}>Orders</h3>
            <p style={{ color: 'var(--color-primary)', fontSize: '24px', fontWeight: 'bold' }}>{reportSummary.orders?.total_orders || 0}</p>
            <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>Revenue: {formatCurrency(reportSummary.orders?.total_revenue || 0)}</p>
          </div>
          <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px' }}>
            <h3 style={{ color: 'var(--color-text-subtle)', fontSize: '12px', marginBottom: '8px' }}>COGS</h3>
            <p style={{ color: 'var(--color-warning)', fontSize: '24px', fontWeight: 'bold' }}>{formatCurrency(reportSummary.orders?.total_cogs || 0)}</p>
            <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>Discounts: {formatCurrency(reportSummary.orders?.total_discounts || 0)}</p>
          </div>
          <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px' }}>
            <h3 style={{ color: 'var(--color-text-subtle)', fontSize: '12px', marginBottom: '8px' }}>Losses</h3>
            <p style={{ color: 'var(--color-danger)', fontSize: '24px', fontWeight: 'bold' }}>{formatCurrency(reportSummary.losses?.total_loss_amount || 0)}</p>
            <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>{reportSummary.losses?.total_losses || 0} records</p>
          </div>
        </div>
      )}

      {/* Payment Breakdown */}
      {reportSummary?.orders && (
        <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
          <h3 style={{ color: 'var(--color-primary)', fontSize: '14px', marginBottom: '12px' }}>Revenue by Payment Method</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--color-primary)', fontSize: '20px', fontWeight: 'bold' }}>
                {formatCurrency(reportSummary.orders.cash_revenue || 0)}
              </p>
              <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>Cash</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--color-primary)', fontSize: '20px', fontWeight: 'bold' }}>
                {formatCurrency(reportSummary.orders.cashapp_revenue || 0)}
              </p>
              <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>CashApp</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--color-primary)', fontSize: '20px', fontWeight: 'bold' }}>
                {formatCurrency(reportSummary.orders.zelle_revenue || 0)}
              </p>
              <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>Zelle</p>
            </div>
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px' }}>
        <h3 style={{ color: 'var(--color-primary)', fontSize: '14px', marginBottom: '16px' }}>Export Data (CSV)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
          <button className="btn" onClick={() => onDownloadReport('sessions')}>
            Sessions
          </button>
          <button className="btn" onClick={() => onDownloadReport('orders')}>
            Orders
          </button>
          <button className="btn" onClick={() => onDownloadReport('inventory')}>
            Inventory
          </button>
          <button className="btn" onClick={() => onDownloadReport('purchases')}>
            Purchases
          </button>
          <button className="btn" onClick={() => onDownloadReport('losses')}>
            Losses
          </button>
          <button className="btn" onClick={() => onDownloadReport('programs')}>
            Programs
          </button>
          <button className="btn" onClick={() => onDownloadReport('reimbursement')}>
            Reimbursement
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportsSection;
