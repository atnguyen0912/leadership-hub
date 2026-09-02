import React from 'react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const VIEWER_REPORTS = [
  { value: 'sessions', label: 'Sessions' },
  { value: 'orders', label: 'Orders' },
  { value: 'session-sales', label: 'Session Sales' },
  { value: 'top-items', label: 'Top Items' },
  { value: 'losses', label: 'Losses' },
  { value: 'programs', label: 'Programs' },
  { value: 'reimbursement', label: 'Reimbursement' },
];

const REPORT_COLUMNS = {
  sessions: [
    { key: 'name', label: 'Session' },
    { key: 'program_name', label: 'Program' },
    { key: 'started_at', label: 'Start', format: 'datetime' },
    { key: 'closed_at', label: 'End', format: 'datetime' },
    { key: 'start_total', label: 'Starting Cash', format: 'currency' },
    { key: 'end_total', label: 'Ending Cash', format: 'currency' },
    { key: 'profit', label: 'Profit', format: 'currency' },
    { key: 'started_by', label: 'Started By' },
    { key: 'closed_by', label: 'Closed By' },
  ],
  orders: [
    { key: 'id', label: 'Order ID' },
    { key: 'session_name', label: 'Session' },
    { key: 'items', label: 'Items' },
    { key: 'subtotal', label: 'Subtotal', format: 'currency' },
    { key: 'discount_amount', label: 'Discount', format: 'currency' },
    { key: 'final_total', label: 'Total', format: 'currency' },
    { key: 'payment_method', label: 'Payment' },
    { key: 'cogs_total', label: 'COGS', format: 'currency' },
    { key: 'created_at', label: 'Date', format: 'datetime' },
  ],
  'session-sales': [
    { key: 'session_name', label: 'Session' },
    { key: 'session_date', label: 'Date' },
    { key: 'program_name', label: 'Program' },
    { key: 'item_name', label: 'Item' },
    { key: 'quantity_sold', label: 'Qty Sold' },
    { key: 'item_revenue', label: 'Revenue', format: 'currency' },
  ],
  'top-items': [
    { key: 'item_name', label: 'Item' },
    { key: 'units_sold', label: 'Units' },
    { key: 'revenue', label: 'Revenue', format: 'currency' },
    { key: 'est_cost', label: 'Est. Cost', format: 'currency' },
    { key: 'est_profit', label: 'Est. Profit', format: 'currency' },
    { key: 'sessions_sold_in', label: 'Sessions' },
    { key: 'avg_per_session', label: 'Avg / Session' },
  ],
  losses: [
    { key: 'loss_type', label: 'Type' },
    { key: 'amount', label: 'Amount', format: 'currency' },
    { key: 'description', label: 'Description' },
    { key: 'session_name', label: 'Session' },
    { key: 'program_name', label: 'Program' },
    { key: 'recorded_by', label: 'Recorded By' },
    { key: 'created_at', label: 'Date', format: 'datetime' },
  ],
  programs: [
    { key: 'name', label: 'Program' },
    { key: 'balance', label: 'Balance', format: 'currency' },
    { key: 'session_count', label: 'Sessions' },
    { key: 'total_profit', label: 'Total Profit', format: 'currency' },
    { key: 'total_distributed', label: 'Distributed', format: 'currency' },
  ],
  reimbursement: [
    { key: 'entry_type', label: 'Type' },
    { key: 'amount', label: 'Amount', format: 'currency' },
    { key: 'session_name', label: 'Session' },
    { key: 'notes', label: 'Notes' },
    { key: 'created_at', label: 'Date', format: 'datetime' },
  ],
};

// Shared styles
const card = { background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px' };
const label = { color: 'var(--color-text-subtle)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' };
const bigVal = (color) => ({ fontSize: '22px', fontWeight: 'bold', color });
const smVal = (color) => ({ fontSize: '14px', fontWeight: '600', color });

const LOSS_COLORS = {
  cash_discrepancy: { bg: 'rgba(239,68,68,0.13)', text: 'var(--color-danger)', label: 'Cash Discrepancy' },
  inventory_discrepancy: { bg: 'rgba(249,115,22,0.13)', text: '#f97316', label: 'Inventory Discrepancy' },
  spoilage: { bg: 'rgba(234,179,8,0.13)', text: '#eab308', label: 'Spoilage' },
  other: { bg: 'rgba(107,114,128,0.13)', text: 'var(--color-text-subtle)', label: 'Other' },
};

// Helper: compute duration string from two datetime strings
function formatDuration(start, end) {
  if (!start || !end) return '-';
  const ms = new Date(end) - new Date(start);
  if (ms <= 0) return '-';
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function ReportPreview({ reportType, data, sortBy }) {
  if (!data || data.length === 0) return null;

  if (reportType === 'sessions') {
    const isSingle = data.length === 1;
    const totalProfit = data.reduce((s, r) => s + (r.profit || 0), 0);

    if (isSingle) {
      const s = data[0];
      const duration = formatDuration(s.started_at, s.closed_at);
      return (
        <div style={{ marginBottom: '12px' }}>
          {/* Session header */}
          <div style={{ ...card, borderLeft: '4px solid var(--color-primary)', marginBottom: '10px' }}>
            <p style={{ fontSize: '17px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{s.name}</p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>{s.program_name || 'No Program'}</p>
          </div>
          {/* Time span */}
          <div style={{ ...card, marginBottom: '10px', textAlign: 'center' }}>
            <p style={label}>Session Duration</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '4px' }}>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Started</p>
                <p style={{ fontSize: '14px', fontWeight: '600' }}>{formatDateTime(s.started_at)}</p>
              </div>
              <span style={{ fontSize: '20px', color: 'var(--color-text-subtle)' }}>&rarr;</span>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>Closed</p>
                <p style={{ fontSize: '14px', fontWeight: '600' }}>{formatDateTime(s.closed_at)}</p>
              </div>
              <div style={{ background: 'rgba(99,102,241,0.1)', padding: '6px 14px', borderRadius: '6px' }}>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{duration}</p>
              </div>
            </div>
          </div>
          {/* Financial flow */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: '0', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ ...card, textAlign: 'center' }}>
              <p style={label}>Starting Cash</p>
              <p style={bigVal('var(--color-text-subtle)')}>{formatCurrency(s.start_total || 0)}</p>
            </div>
            <span style={{ fontSize: '24px', color: 'var(--color-text-subtle)', padding: '0 8px' }}>&rarr;</span>
            <div style={{ ...card, textAlign: 'center' }}>
              <p style={label}>Ending Cash</p>
              <p style={bigVal('var(--color-primary)')}>{formatCurrency(s.end_total || 0)}</p>
            </div>
            <span style={{ fontSize: '24px', color: 'var(--color-text-subtle)', padding: '0 8px' }}>=</span>
            <div style={{ ...card, textAlign: 'center', borderTop: `3px solid ${(s.profit || 0) >= 0 ? 'var(--color-primary)' : 'var(--color-danger)'}` }}>
              <p style={label}>Profit</p>
              <p style={bigVal((s.profit || 0) >= 0 ? 'var(--color-primary)' : 'var(--color-danger)')}>{formatCurrency(s.profit || 0)}</p>
            </div>
          </div>
          {/* Operators */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={card}>
              <p style={label}>Started By</p>
              <p style={{ fontSize: '14px', fontWeight: '600' }}>{s.started_by || '-'}</p>
            </div>
            <div style={card}>
              <p style={label}>Closed By</p>
              <p style={{ fontSize: '14px', fontWeight: '600' }}>{s.closed_by || '-'}</p>
            </div>
          </div>
        </div>
      );
    }

    // Multiple sessions view
    const avgProfit = totalProfit / data.length;
    const byProgram = {};
    data.forEach(r => {
      const p = r.program_name || 'Unassigned';
      if (!byProgram[p]) byProgram[p] = { count: 0, profit: 0 };
      byProgram[p].count++;
      byProgram[p].profit += r.profit || 0;
    });
    const programNames = Object.keys(byProgram);

    return (
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '10px' }}>
          <div style={card}><p style={label}>Sessions</p><p style={bigVal('var(--color-primary)')}>{data.length}</p></div>
          <div style={card}><p style={label}>Total Profit</p><p style={bigVal('var(--color-primary)')}>{formatCurrency(totalProfit)}</p></div>
          <div style={card}><p style={label}>Avg Profit</p><p style={bigVal('var(--color-text-subtle)')}>{formatCurrency(avgProfit)}</p></div>
        </div>
        {/* Per-session compact list */}
        <div style={{ ...card, padding: '12px', marginBottom: '10px' }}>
          {data.map((s, i) => (
            <div key={s.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < data.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>{s.name}</span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginLeft: '8px' }}>{s.program_name || ''}</span>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', background: 'var(--color-bg)', padding: '2px 8px', borderRadius: '4px' }}>
                  {formatDuration(s.started_at, s.closed_at)}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: (s.profit || 0) >= 0 ? 'var(--color-primary)' : 'var(--color-danger)', minWidth: '70px', textAlign: 'right' }}>
                  {formatCurrency(s.profit || 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
        {/* Per-program breakdown */}
        {programNames.length > 1 && (
          <div style={{ ...card, padding: '12px' }}>
            <p style={{ ...label, marginBottom: '8px' }}>By Program</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
              {programNames.map(name => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--color-bg)', borderRadius: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{name}</span>
                  <span style={{ fontSize: '13px', color: 'var(--color-primary)' }}>{byProgram[name].count} sessions / {formatCurrency(byProgram[name].profit)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (reportType === 'orders') {
    const totalRevenue = data.reduce((s, r) => s + (r.final_total || r.subtotal || 0), 0);
    const totalCogs = data.reduce((s, r) => s + (r.cogs_total || 0), 0);
    const totalCogsReimbursable = data.reduce((s, r) => s + (r.cogs_reimbursable || 0), 0);
    const totalDiscount = data.reduce((s, r) => s + (r.discount_amount || 0), 0);
    const grossMargin = totalRevenue - totalCogs;
    const cogsPercent = totalRevenue > 0 ? ((totalCogs / totalRevenue) * 100).toFixed(1) : '0.0';
    const comps = data.filter(r => r.is_comp);
    const compValue = comps.reduce((s, r) => s + (r.final_total || r.subtotal || 0), 0);

    // Payment breakdown
    const payments = { cash: { count: 0, rev: 0 }, cashapp: { count: 0, rev: 0 }, zelle: { count: 0, rev: 0 } };
    data.forEach(r => {
      const m = r.payment_method || 'cash';
      if (payments[m]) {
        payments[m].count++;
        payments[m].rev += r.final_total || r.subtotal || 0;
      }
    });

    return (
      <div style={{ marginBottom: '12px' }}>
        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '10px' }}>
          <div style={card}>
            <p style={label}>Orders</p>
            <p style={bigVal('var(--color-primary)')}>{data.length}</p>
          </div>
          <div style={card}>
            <p style={label}>Revenue</p>
            <p style={bigVal('var(--color-primary)')}>{formatCurrency(totalRevenue)}</p>
          </div>
          <div style={card}>
            <p style={label}>COGS</p>
            <p style={bigVal('var(--color-warning)')}>{formatCurrency(totalCogs)}</p>
          </div>
          <div style={card}>
            <p style={label}>Gross Margin</p>
            <p style={bigVal(grossMargin >= 0 ? 'var(--color-primary)' : 'var(--color-danger)')}>{formatCurrency(grossMargin)}</p>
          </div>
        </div>
        {/* COGS & Comp detail */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div style={{ ...card, borderLeft: '4px solid var(--color-warning)' }}>
            <p style={{ ...label, marginBottom: '8px' }}>COGS Breakdown</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-subtle)' }}>Total COGS</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(totalCogs)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-subtle)' }}>Reimbursable</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(totalCogsReimbursable)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--color-text-subtle)' }}>COGS % of Revenue</span>
              <span style={{ fontWeight: '600', color: 'var(--color-warning)' }}>{cogsPercent}%</span>
            </div>
          </div>
          <div style={{ ...card, borderLeft: `4px solid ${comps.length > 0 ? 'var(--color-danger)' : 'var(--color-text-subtle)'}` }}>
            <p style={{ ...label, marginBottom: '8px' }}>Comps & Discounts</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-subtle)' }}>Comped Orders</span>
              <span style={{ fontWeight: '600', color: comps.length > 0 ? 'var(--color-danger)' : 'inherit' }}>{comps.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--color-text-subtle)' }}>Comp Value</span>
              <span style={{ fontWeight: '600', color: compValue > 0 ? 'var(--color-danger)' : 'inherit' }}>{formatCurrency(compValue)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--color-text-subtle)' }}>Total Discounts</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(totalDiscount)}</span>
            </div>
          </div>
        </div>
        {/* Payment breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[['cash', 'Cash'], ['cashapp', 'CashApp'], ['zelle', 'Zelle']].map(([key, name]) => (
            <div key={key} style={{ ...card, textAlign: 'center' }}>
              <p style={bigVal('var(--color-primary)')}>{formatCurrency(payments[key].rev)}</p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>{name} ({payments[key].count} orders)</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (reportType === 'session-sales') {
    const totalQty = data.reduce((s, r) => s + (r.quantity_sold || 0), 0);
    const totalRev = data.reduce((s, r) => s + (r.item_revenue || 0), 0);
    const avgPrice = totalQty > 0 ? totalRev / totalQty : 0;

    // Item rankings — all items, no cap
    const byItem = {};
    data.forEach(r => {
      const n = r.item_name;
      if (!byItem[n]) byItem[n] = { qty: 0, rev: 0 };
      byItem[n].qty += r.quantity_sold || 0;
      byItem[n].rev += r.item_revenue || 0;
    });
    const ranked = Object.entries(byItem).sort((a, b) => b[1].qty - a[1].qty);
    const maxQty = ranked.length > 0 ? ranked[0][1].qty : 1;

    // Per-session rollup
    const bySess = {};
    data.forEach(r => {
      const s = r.session_name;
      if (!bySess[s]) bySess[s] = { qty: 0, rev: 0 };
      bySess[s].qty += r.quantity_sold || 0;
      bySess[s].rev += r.item_revenue || 0;
    });
    const sessEntries = Object.entries(bySess).sort((a, b) => b[1].rev - a[1].rev);

    return (
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '10px' }}>
          <div style={card}><p style={label}>Total Qty Sold</p><p style={bigVal('var(--color-primary)')}>{totalQty}</p></div>
          <div style={card}><p style={label}>Total Revenue</p><p style={bigVal('var(--color-primary)')}>{formatCurrency(totalRev)}</p></div>
          <div style={card}><p style={label}>Avg Price / Item</p><p style={bigVal('var(--color-text-subtle)')}>{formatCurrency(avgPrice)}</p></div>
        </div>
        {/* Item ranking bars */}
        {ranked.length > 0 && (
          <div style={{ ...card, padding: '12px', marginBottom: '10px' }}>
            <p style={{ ...label, marginBottom: '8px' }}>Item Rankings</p>
            {ranked.map(([name, { qty, rev }], idx) => {
              const itemAvg = qty > 0 ? rev / qty : 0;
              const isTop = idx === 0;
              return (
                <div key={name} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', padding: '3px 6px',
                  borderRadius: '4px',
                  background: isTop ? 'rgba(34,197,94,0.08)' : 'transparent',
                }}>
                  <span style={{
                    width: '14px', fontSize: '11px', color: isTop ? 'var(--color-primary)' : 'var(--color-text-subtle)',
                    fontWeight: isTop ? 'bold' : 'normal', textAlign: 'right', flexShrink: 0,
                  }}>
                    {isTop ? '#1' : ''}
                  </span>
                  <span style={{ width: '110px', fontSize: '13px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isTop ? '700' : '400' }}>{name}</span>
                  <div style={{ flex: 1, background: 'var(--color-bg)', borderRadius: '3px', height: '20px' }}>
                    <div style={{
                      width: `${(qty / maxQty) * 100}%`, height: '100%',
                      background: isTop ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.15)', borderRadius: '3px',
                      display: 'flex', alignItems: 'center', paddingLeft: '6px',
                    }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>{qty} sold</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)', width: '55px', textAlign: 'right', flexShrink: 0 }}>
                    @{formatCurrency(itemAvg)}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-primary)', width: '65px', textAlign: 'right', flexShrink: 0 }}>{formatCurrency(rev)}</span>
                </div>
              );
            })}
          </div>
        )}
        {/* Per-session breakdown */}
        {sessEntries.length > 1 && (
          <div style={{ ...card, padding: '12px' }}>
            <p style={{ ...label, marginBottom: '8px' }}>By Session</p>
            {sessEntries.map(([name, { qty, rev }]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '13px' }}>{name}</span>
                <span style={{ fontSize: '13px' }}>
                  <span style={{ color: 'var(--color-text-subtle)', marginRight: '12px' }}>{qty} items</span>
                  <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{formatCurrency(rev)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (reportType === 'top-items') {
    const METRICS = {
      units: { key: 'units_sold', label: 'units', currency: false },
      revenue: { key: 'revenue', label: 'revenue', currency: true },
      profit: { key: 'est_profit', label: 'profit', currency: true },
    };
    const metric = METRICS[sortBy] || METRICS.units;

    const totalUnits = data.reduce((s, r) => s + (r.units_sold || 0), 0);
    const totalRev = data.reduce((s, r) => s + (r.revenue || 0), 0);
    const totalProfit = data.reduce((s, r) => s + (r.est_profit || 0), 0);
    const totalSessions = data[0]?.total_sessions || 0;
    const hasCostData = data.some(r => (r.est_cost || 0) > 0);

    // Bars scale to the largest value of whichever metric is being ranked
    const maxVal = Math.max(...data.map(r => Math.abs(r[metric.key] || 0)), 1);
    const fmt = (v) => (metric.currency ? formatCurrency(v) : `${v}`);

    return (
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '10px' }}>
          <div style={card}><p style={label}>Sessions</p><p style={bigVal('var(--color-text-subtle)')}>{totalSessions}</p></div>
          <div style={card}><p style={label}>Distinct Items</p><p style={bigVal('var(--color-text-subtle)')}>{data.length}</p></div>
          <div style={card}><p style={label}>Units Sold</p><p style={bigVal('var(--color-primary)')}>{totalUnits}</p></div>
          <div style={card}><p style={label}>Revenue</p><p style={bigVal('var(--color-primary)')}>{formatCurrency(totalRev)}</p></div>
          <div style={card}>
            <p style={label}>Est. Profit</p>
            <p style={bigVal(totalProfit >= 0 ? 'var(--color-primary)' : 'var(--color-danger)')}>{formatCurrency(totalProfit)}</p>
          </div>
        </div>

        <div style={{ ...card, padding: '12px' }}>
          <p style={{ ...label, marginBottom: '8px' }}>Ranked by {metric.label}</p>
          {data.map((r, idx) => {
            const value = r[metric.key] || 0;
            const isTop = idx === 0;
            const everySession = totalSessions > 0 && r.sessions_sold_in === totalSessions;
            return (
              <div key={r.item_name} style={{
                display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', padding: '3px 6px',
                borderRadius: '4px',
                background: isTop ? 'rgba(34,197,94,0.08)' : 'transparent',
              }}>
                <span style={{
                  width: '20px', fontSize: '11px', textAlign: 'right', flexShrink: 0,
                  color: isTop ? 'var(--color-primary)' : 'var(--color-text-subtle)',
                  fontWeight: isTop ? 'bold' : 'normal',
                }}>
                  {idx + 1}
                </span>
                <span style={{
                  width: '110px', fontSize: '13px', flexShrink: 0, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isTop ? '700' : '400',
                }}>
                  {r.item_name}
                </span>
                <div style={{ flex: 1, background: 'var(--color-bg)', borderRadius: '3px', height: '20px' }}>
                  <div style={{
                    width: `${(Math.abs(value) / maxVal) * 100}%`, height: '100%',
                    background: value < 0
                      ? 'rgba(239,68,68,0.3)'
                      : isTop ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.15)',
                    borderRadius: '3px', display: 'flex', alignItems: 'center', paddingLeft: '6px',
                  }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>
                      {fmt(value)}
                    </span>
                  </div>
                </div>
                <span
                  title={`Sold in ${r.sessions_sold_in} of ${totalSessions} sessions`}
                  style={{
                    fontSize: '11px', width: '46px', textAlign: 'right', flexShrink: 0,
                    color: everySession ? 'var(--color-primary)' : 'var(--color-text-subtle)',
                    fontWeight: everySession ? '600' : '400',
                  }}
                >
                  {r.sessions_sold_in}/{totalSessions}
                </span>
                <span
                  title="Average units sold per session it appeared in"
                  style={{ fontSize: '12px', color: 'var(--color-text-subtle)', width: '58px', textAlign: 'right', flexShrink: 0 }}
                >
                  {r.avg_per_session}/sess
                </span>
                {r.comp_units > 0 && (
                  <span
                    title={`${r.comp_units} comped (counted in units, not revenue)`}
                    style={{ fontSize: '10px', color: 'var(--color-warning)', width: '46px', textAlign: 'right', flexShrink: 0 }}
                  >
                    {r.comp_units} comp
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {!hasCostData && (
          <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '8px' }}>
            Est. Cost is $0 because no unit costs are recorded for these items — add purchases so cost flows into inventory, and profit here will fill in.
          </p>
        )}
        <p style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '6px' }}>
          Practice sessions excluded. Est. Cost uses each item&apos;s current unit cost, so profit is an estimate rather than the COGS booked at sale time.
        </p>
      </div>
    );
  }

  if (reportType === 'losses') {
    const totalLoss = data.reduce((s, r) => s + (r.amount || 0), 0);
    // Group by type
    const byType = {};
    data.forEach(r => {
      const t = r.loss_type || 'other';
      if (!byType[t]) byType[t] = { count: 0, total: 0 };
      byType[t].count++;
      byType[t].total += r.amount || 0;
    });
    // Largest single loss
    const largest = data.length > 1 ? [...data].sort((a, b) => (b.amount || 0) - (a.amount || 0))[0] : null;

    return (
      <div style={{ marginBottom: '12px' }}>
        {/* Hero card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.05) 100%)',
          border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px',
          padding: '20px', textAlign: 'center', marginBottom: '10px'
        }}>
          <p style={{ ...label, color: 'var(--color-danger)' }}>Total Losses</p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-danger)' }}>{formatCurrency(totalLoss)}</p>
          <p style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>{data.length} record{data.length !== 1 ? 's' : ''}</p>
        </div>
        {/* By type */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '10px' }}>
          {Object.entries(byType).map(([type, { count, total }]) => {
            const colors = LOSS_COLORS[type] || LOSS_COLORS.other;
            return (
              <div key={type} style={{ ...card, borderLeft: `4px solid ${colors.text}` }}>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                  fontSize: '11px', fontWeight: '600', background: colors.bg, color: colors.text, marginBottom: '6px'
                }}>
                  {(colors.label || type.replace(/_/g, ' ')).toUpperCase()}
                </span>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: colors.text }}>{formatCurrency(total)}</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>{count} record{count !== 1 ? 's' : ''}</p>
              </div>
            );
          })}
        </div>
        {/* Largest loss */}
        {largest && (
          <div style={{ ...card, padding: '12px', borderLeft: '4px solid var(--color-danger)' }}>
            <p style={{ ...label, marginBottom: '4px' }}>Largest Single Loss</p>
            <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-danger)' }}>{formatCurrency(largest.amount)}</p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
              {largest.description || 'No description'} &mdash; {formatDateTime(largest.created_at)}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (reportType === 'programs') {
    const totalBalance = data.reduce((s, r) => s + (r.balance || 0), 0);
    const totalProfit = data.reduce((s, r) => s + (r.total_profit || 0), 0);
    const totalDistributed = data.reduce((s, r) => s + (r.total_distributed || 0), 0);
    const totalSessions = data.reduce((s, r) => s + (r.session_count || 0), 0);
    const colors = ['var(--color-primary)', 'var(--color-info)', '#f97316', '#eab308', '#22c55e', '#8b5cf6'];

    return (
      <div style={{ marginBottom: '12px' }}>
        {/* Per-program cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px', marginBottom: '10px' }}>
          {data.map((p, i) => {
            const undistributed = (p.total_profit || 0) - (p.total_distributed || 0);
            return (
              <div key={p.id || i} style={{ ...card, borderLeft: `4px solid ${colors[i % colors.length]}` }}>
                <p style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px', color: colors[i % colors.length] }}>{p.name}</p>
                <p style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '8px' }}>{formatCurrency(p.balance || 0)}</p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-subtle)' }}>Sessions: </span>
                    <span style={{ fontWeight: '600' }}>{p.session_count || 0}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-subtle)' }}>Profit: </span>
                    <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{formatCurrency(p.total_profit || 0)}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-subtle)' }}>Distributed: </span>
                    <span style={{ fontWeight: '600' }}>{formatCurrency(p.total_distributed || 0)}</span>
                  </div>
                </div>
                {undistributed > 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--color-warning)', marginTop: '4px', fontWeight: '600' }}>
                    Undistributed: {formatCurrency(undistributed)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {/* Totals row */}
        {data.length > 1 && (
          <div style={{ ...card, display: 'flex', justifyContent: 'space-around', textAlign: 'center', borderTop: '2px solid var(--color-primary)' }}>
            <div><p style={label}>Total Balance</p><p style={smVal('var(--color-primary)')}>{formatCurrency(totalBalance)}</p></div>
            <div><p style={label}>Total Profit</p><p style={smVal('var(--color-primary)')}>{formatCurrency(totalProfit)}</p></div>
            <div><p style={label}>Total Distributed</p><p style={smVal('var(--color-text-subtle)')}>{formatCurrency(totalDistributed)}</p></div>
            <div><p style={label}>Total Sessions</p><p style={smVal('var(--color-text-subtle)')}>{totalSessions}</p></div>
          </div>
        )}
      </div>
    );
  }

  if (reportType === 'reimbursement') {
    const cogsOwed = data.filter(r => r.entry_type === 'cogs_owed').reduce((s, r) => s + (r.amount || 0), 0);
    const asbLoss = data.filter(r => r.entry_type === 'asb_loss').reduce((s, r) => s + (r.amount || 0), 0);
    const zelleRcv = data.filter(r => r.entry_type === 'zelle_received').reduce((s, r) => s + (r.amount || 0), 0);
    const cashappWd = data.filter(r => r.entry_type === 'cashapp_withdrawal').reduce((s, r) => s + (r.amount || 0), 0);
    const cashboxRe = data.filter(r => r.entry_type === 'cashbox_reimbursement').reduce((s, r) => s + (r.amount || 0), 0);
    const totalReceived = zelleRcv + cashappWd + cashboxRe;
    const netOwed = cogsOwed - asbLoss;
    const remaining = netOwed - totalReceived;

    return (
      <div style={{ marginBottom: '12px' }}>
        {/* Owed section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div style={{ ...card, borderLeft: '4px solid var(--color-info)' }}>
            <p style={label}>COGS Owed</p>
            <p style={bigVal('var(--color-info)')}>{formatCurrency(cogsOwed)}</p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
              {data.filter(r => r.entry_type === 'cogs_owed').length} entries
            </p>
          </div>
          <div style={{ ...card, borderLeft: '4px solid var(--color-danger)' }}>
            <p style={label}>ASB Losses</p>
            <p style={bigVal('var(--color-danger)')}>{formatCurrency(asbLoss)}</p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
              Net owed: {formatCurrency(netOwed)}
            </p>
          </div>
        </div>
        {/* Received section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
          {[
            ['Zelle Received', zelleRcv, 'rgba(34,197,94,0.1)'],
            ['CashApp Withdrawal', cashappWd, 'rgba(139,92,246,0.1)'],
            ['Cashbox Reimbursement', cashboxRe, 'rgba(59,130,246,0.1)'],
          ].map(([name, amt, bg]) => (
            <div key={name} style={{ ...card, background: bg, textAlign: 'center' }}>
              <p style={{ ...label, fontSize: '10px' }}>{name}</p>
              <p style={smVal('var(--color-primary)')}>{formatCurrency(amt)}</p>
            </div>
          ))}
        </div>
        {/* Remaining */}
        <div style={{
          background: remaining > 0
            ? 'linear-gradient(135deg, rgba(234,179,8,0.12) 0%, rgba(234,179,8,0.04) 100%)'
            : 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 100%)',
          border: `1px solid ${remaining > 0 ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.3)'}`,
          borderRadius: '8px', padding: '20px', textAlign: 'center'
        }}>
          <p style={label}>Net Remaining</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: remaining > 0 ? 'var(--color-warning)' : '#22c55e' }}>
            {formatCurrency(remaining)}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
            {formatCurrency(totalReceived)} received of {formatCurrency(netOwed)} owed
          </p>
        </div>
      </div>
    );
  }

  return null;
}

function formatCell(value, format) {
  if (value === null || value === undefined || value === '') return '-';
  if (format === 'currency') return formatCurrency(value);
  if (format === 'datetime') return formatDateTime(value);
  return String(value);
}

function ReportsSection({
  reportStartDate,
  setReportStartDate,
  reportEndDate,
  setReportEndDate,
  reportSummary,
  loadingReport,
  onFetchReport,
  onClearFilters,
  onDownloadReport,
  selectedReport,
  setSelectedReport,
  reportData,
  loadingReportData,
  onPreviewReport,
  sessions,
  programs,
  reportSessionFilter,
  setReportSessionFilter,
  reportProgramFilter,
  setReportProgramFilter,
  reportSortBy,
  setReportSortBy
}) {
  const columns = selectedReport ? REPORT_COLUMNS[selectedReport] : [];

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

      {/* Report Viewer */}
      <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
        <h3 style={{ color: 'var(--color-primary)', fontSize: '14px', marginBottom: '12px' }}>Report Viewer</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: reportData.length > 0 ? '12px' : 0 }}>
          <select
            className="input"
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
            style={{ minWidth: '180px', flex: '0 1 auto' }}
          >
            <option value="">Select a report...</option>
            {VIEWER_REPORTS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {['sessions', 'orders', 'session-sales', 'reimbursement'].includes(selectedReport) && (
            <select
              className="input"
              value={reportSessionFilter}
              onChange={(e) => setReportSessionFilter(e.target.value)}
              style={{ minWidth: '180px', flex: '0 1 auto' }}
            >
              <option value="">All Sessions</option>
              {(sessions || [])
                .filter(s => s.status === 'closed')
                .map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
          )}
          {['programs', 'losses', 'top-items'].includes(selectedReport) && (
            <select
              className="input"
              value={reportProgramFilter}
              onChange={(e) => setReportProgramFilter(e.target.value)}
              style={{ minWidth: '180px', flex: '0 1 auto' }}
            >
              <option value="">All Programs</option>
              {(programs || []).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          {selectedReport === 'top-items' && (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>Rank by</span>
              {[
                { value: 'units', label: 'Units' },
                { value: 'revenue', label: 'Revenue' },
                { value: 'profit', label: 'Profit' },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`btn btn-small ${reportSortBy === opt.value ? 'btn-primary' : ''}`}
                  onClick={() => setReportSortBy(opt.value)}
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          <button
            className="btn btn-primary"
            onClick={() => onPreviewReport(selectedReport)}
            disabled={!selectedReport || loadingReportData}
          >
            {loadingReportData ? 'Loading...' : 'Preview'}
          </button>
          {selectedReport && (
            <button
              className="btn"
              onClick={() => onDownloadReport(selectedReport)}
            >
              Export CSV
            </button>
          )}
          {reportData.length > 0 && (
            <span style={{ color: 'var(--color-text-subtle)', fontSize: '12px', marginLeft: '8px' }}>
              Showing {reportData.length} records
            </span>
          )}
        </div>

        {/* Report Preview */}
        <ReportPreview reportType={selectedReport} data={reportData} sortBy={reportSortBy} />

        {/* Data Table */}
        {selectedReport && reportData.length > 0 && (
          <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {columns.map(col => (
                    <th
                      key={col.key}
                      style={{
                        textAlign: col.format === 'currency' ? 'right' : 'left',
                        padding: '8px 10px',
                        borderBottom: '2px solid var(--color-border)',
                        color: 'var(--color-text-subtle)',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        position: 'sticky',
                        top: 0,
                        background: 'var(--color-bg-input)',
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, i) => (
                  <tr key={row.id || i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {columns.map(col => (
                      <td
                        key={col.key}
                        style={{
                          padding: '7px 10px',
                          textAlign: col.format === 'currency' ? 'right' : 'left',
                          whiteSpace: col.key === 'items' || col.key === 'description' || col.key === 'notes' ? 'normal' : 'nowrap',
                          maxWidth: col.key === 'items' || col.key === 'description' || col.key === 'notes' ? '250px' : 'none',
                        }}
                      >
                        {formatCell(row[col.key], col.format)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport && reportData.length === 0 && !loadingReportData && (
          <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px', textAlign: 'center', padding: '16px 0', margin: 0 }}>
            No data found for the selected date range. Click Preview to load data.
          </p>
        )}
      </div>

      {/* Export Buttons */}
      <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px' }}>
        <h3 style={{ color: 'var(--color-primary)', fontSize: '14px', marginBottom: '16px' }}>Export All (CSV)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
          <button className="btn" onClick={() => onDownloadReport('sessions')}>Sessions</button>
          <button className="btn" onClick={() => onDownloadReport('orders')}>Orders</button>
          <button className="btn" onClick={() => onDownloadReport('session-sales')}>Session Sales</button>
          <button className="btn" onClick={() => onDownloadReport('inventory')}>Inventory</button>
          <button className="btn" onClick={() => onDownloadReport('purchases')}>Purchases</button>
          <button className="btn" onClick={() => onDownloadReport('losses')}>Losses</button>
          <button className="btn" onClick={() => onDownloadReport('programs')}>Programs</button>
          <button className="btn" onClick={() => onDownloadReport('reimbursement')}>Reimbursement</button>
        </div>
      </div>
    </div>
  );
}

export default ReportsSection;
