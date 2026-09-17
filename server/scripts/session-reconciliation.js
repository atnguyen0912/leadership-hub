/**
 * Per-session reconciliation report.
 *
 * Two independent measurements of the same session:
 *
 *   1. The order rows  - what the POS recorded being sold, and at what cost.
 *   2. The drawer      - what was physically counted at open and close.
 *
 * Margin profit comes from (1). The drawer delta is NOT profit: it only ever
 * reflects cash sales, so the honest comparison is
 *
 *   expected drawer = starting cash + CASH revenue
 *   cash variance   = counted drawer - expected drawer
 *
 * A variance means the two records disagree. Over = cash present that no order
 * accounts for (unrecorded sales). Short = sales recorded whose cash is missing.
 *
 * Read-only - this script never writes.
 *
 *   node server/scripts/session-reconciliation.js
 *   DB_PATH=/path/to/leadership.db node server/scripts/session-reconciliation.js
 *   node server/scripts/session-reconciliation.js --json
 */

const database = require('../database');
const { get, all } = require('../db-utils');

const JSON_OUT = process.argv.includes('--json');
const r2 = (n) => Math.round((n || 0) * 100) / 100;
const m = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(r2(n)).toFixed(2);
const pad = (s, w) => String(s).padEnd(w);
const lpad = (s, w) => String(s).padStart(w);
const line = (label, value, w = 30) => `    ${pad(label, w)}${lpad(m(value), 10)}`;
const rule = (w = 40) => '    ' + '-'.repeat(w);

async function buildReport() {
  const sessions = await all(
    `SELECT id, name, program_id, status, closed_at,
            COALESCE(start_total, 0)  as start_total,
            COALESCE(end_total, 0)    as end_total,
            COALESCE(profit, 0)       as stored_profit,
            COALESCE(bulk_cogs, 0)    as bulk_cogs,
            bulk_cogs_source
     FROM concession_sessions
     WHERE status = 'closed' AND COALESCE(is_test, 0) = 0
     ORDER BY id`
  );

  const rows = [];

  for (const s of sessions) {
    const o = await get(
      `SELECT COUNT(*) as order_count,
              COALESCE(SUM(COALESCE(final_total, subtotal)), 0) as revenue,
              COALESCE(SUM(CASE WHEN payment_method = 'cash'    THEN COALESCE(final_total, subtotal) ELSE 0 END), 0) as cash,
              COALESCE(SUM(CASE WHEN payment_method = 'cashapp' THEN COALESCE(final_total, subtotal) ELSE 0 END), 0) as cashapp,
              COALESCE(SUM(CASE WHEN payment_method = 'zelle'   THEN COALESCE(final_total, subtotal) ELSE 0 END), 0) as zelle,
              COALESCE(SUM(COALESCE(cogs_total, 0)), 0) as order_cogs,
              COALESCE(SUM(CASE WHEN is_comp = 1 THEN COALESCE(discount_amount, 0) ELSE 0 END), 0) as comp_value,
              COALESCE(SUM(COALESCE(discount_amount, 0)), 0) as discounts_total
       FROM orders WHERE session_id = ?`,
      [s.id]
    );

    const program = s.program_id
      ? await get('SELECT name FROM cashbox_programs WHERE id = ?', [s.program_id])
      : null;

    const totalCogs   = r2(o.order_cogs + s.bulk_cogs);
    const marginProfit = r2(o.revenue - totalCogs);
    const drawerDelta  = r2(s.end_total - s.start_total);
    const expectedDrawer = r2(s.start_total + o.cash);
    const cashVariance = r2(s.end_total - expectedDrawer);

    rows.push({
      id: s.id,
      name: s.name,
      closedAt: s.closed_at,
      program: program?.name || null,
      orderCount: o.order_count,
      revenue: r2(o.revenue),
      cash: r2(o.cash),
      cashapp: r2(o.cashapp),
      zelle: r2(o.zelle),
      discountsOnly: r2(o.discounts_total - o.comp_value),
      compValue: r2(o.comp_value),
      orderCogs: r2(o.order_cogs),
      bulkCogs: r2(s.bulk_cogs),
      bulkCogsSource: s.bulk_cogs_source,
      totalCogs,
      marginProfit,
      storedProfit: r2(s.stored_profit),
      startTotal: r2(s.start_total),
      endTotal: r2(s.end_total),
      drawerDelta,
      expectedDrawer,
      cashVariance
    });
  }

  return rows;
}

function printReport(rows) {
  if (rows.length === 0) {
    console.log('No closed sessions found.');
    return;
  }

  for (const s of rows) {
    console.log('');
    console.log('='.repeat(52));
    console.log(`#${s.id}  ${s.name}`);
    console.log(`${s.program ? 'Program: ' + s.program + '  |  ' : ''}Orders: ${s.orderCount}${s.closedAt ? '  |  Closed: ' + s.closedAt : ''}`);
    console.log('='.repeat(52));

    console.log('\n  REVENUE  (from order rows, net of discounts and comps)');
    console.log(line('Cash', s.cash));
    console.log(line('CashApp', s.cashapp));
    console.log(line('Zelle', s.zelle));
    console.log(rule());
    console.log(line('Total revenue', s.revenue));
    if (s.discountsOnly > 0 || s.compValue > 0) {
      console.log(`    (already deducted: discounts ${m(s.discountsOnly)}, comps ${m(s.compValue)})`);
    }

    console.log('\n  COST');
    console.log(line('Order COGS', s.orderCogs));
    const bulkNote = s.bulkCogs === 0 && !s.bulkCogsSource ? '  <- never booked' :
                     s.bulkCogsSource === 'estimated' ? '  (estimated)' : '';
    console.log(line('Bulk COGS', s.bulkCogs) + bulkNote);
    console.log(rule());
    console.log(line('Total COGS', s.totalCogs));

    console.log('\n  MARGIN PROFIT  (revenue - COGS)');
    console.log(line('Margin profit', s.marginProfit));
    if (s.storedProfit !== s.marginProfit) {
      console.log(`    ${pad('Stored profit on record', 30)}${lpad(m(s.storedProfit), 10)}  <- disagrees`);
    }

    console.log('\n  DRAWER  (physically counted)');
    console.log(line('Starting cash', s.startTotal));
    console.log(line('Counted at close', s.endTotal));
    console.log(rule());
    console.log(line('Drawer delta', s.drawerDelta));

    console.log('\n  RECONCILIATION  (drawer vs. cash sales on record)');
    console.log(line('Expected: start + cash sales', s.expectedDrawer));
    console.log(line('Actual counted', s.endTotal));
    console.log(rule());
    const verdict = Math.abs(s.cashVariance) < 0.005 ? 'BALANCED'
                  : s.cashVariance > 0 ? 'OVER  - cash with no order behind it'
                  : 'SHORT - orders with no cash behind them';
    console.log(line('Cash variance', s.cashVariance) + '   ' + verdict);
  }

  // ---- portfolio summary ----
  const sum = (k) => r2(rows.reduce((a, b) => a + b[k], 0));
  console.log('');
  console.log('='.repeat(52));
  console.log('SUMMARY  (' + rows.length + ' closed session' + (rows.length === 1 ? '' : 's') + ')');
  console.log('='.repeat(52));
  console.log(line('Total revenue recorded', sum('revenue')));
  console.log(line('Total COGS', sum('totalCogs')));
  console.log(line('Total margin profit', sum('marginProfit')));
  console.log(line('Total stored profit', sum('storedProfit')));
  console.log(rule());
  console.log(line('Total drawer delta', sum('drawerDelta')));
  console.log(line('Total cash variance', sum('cashVariance')));

  const over  = rows.filter((x) => x.cashVariance > 0.005);
  const short = rows.filter((x) => x.cashVariance < -0.005);
  const bal   = rows.length - over.length - short.length;
  console.log('');
  console.log(`    Balanced: ${bal}   Over: ${over.length}   Short: ${short.length}`);
  if (over.length) {
    console.log(`    Sessions over by more than their own revenue: ` +
      over.filter((x) => x.cashVariance > x.revenue).map((x) => '#' + x.id).join(', ') || '    (none)');
  }
  console.log('');
}

async function main() {
  await database.initialize();
  await new Promise((r) => setTimeout(r, 3000)); // migrations run detached
  const rows = await buildReport();
  if (JSON_OUT) console.log(JSON.stringify(rows, null, 2));
  else printReport(rows);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Report failed:', err.message);
    process.exit(1);
  });
