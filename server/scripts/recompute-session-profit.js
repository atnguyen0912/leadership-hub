/**
 * Recompute stored session profit under the margin formula.
 *
 *   profit = revenue - (order COGS + bulk COGS)
 *
 * Sessions closed before the cash-delta close path was retired hold
 * `end_total - start_total` instead, which is drawer growth rather than margin.
 * This rewrites those figures and moves each program's balance by the same delta,
 * so the balance stays consistent with the sum of its session profits.
 *
 * Dry run by default - prints what would change and writes nothing.
 *
 *   node server/scripts/recompute-session-profit.js
 *   node server/scripts/recompute-session-profit.js --apply
 *   DB_PATH=/path/to/leadership.db node server/scripts/recompute-session-profit.js --apply
 */

const database = require('../database');
const { run, get, all, transaction } = require('../db-utils');

const APPLY = process.argv.includes('--apply');
const money = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(n).toFixed(2);
const round2 = (n) => Math.round(n * 100) / 100;

async function main() {
  await database.initialize();
  // migrations run detached from initialize(); let them land before reading
  await new Promise((r) => setTimeout(r, 3000));

  const sessions = await all(
    `SELECT id, name, program_id, start_total, end_total, profit,
            COALESCE(bulk_cogs, 0) as bulk_cogs, COALESCE(is_test, 0) as is_test
     FROM concession_sessions
     WHERE status = 'closed' AND COALESCE(is_test, 0) = 0
     ORDER BY id`
  );

  if (sessions.length === 0) {
    console.log('No closed sessions to recompute.');
    return;
  }

  const changes = [];
  const suspect = [];

  for (const s of sessions) {
    const totals = await get(
      `SELECT COALESCE(SUM(COALESCE(final_total, subtotal)), 0) as revenue,
              COALESCE(SUM(COALESCE(cogs_total, 0)), 0) as cogs,
              COUNT(*) as order_count
       FROM orders WHERE session_id = ?`,
      [s.id]
    );

    const newProfit = round2(totals.revenue - (totals.cogs + s.bulk_cogs));
    const oldProfit = round2(s.profit || 0);
    const delta = round2(newProfit - oldProfit);

    const row = {
      id: s.id,
      name: s.name,
      programId: s.program_id,
      orderCount: totals.order_count,
      revenue: round2(totals.revenue),
      orderCogs: round2(totals.cogs),
      bulkCogs: round2(s.bulk_cogs),
      oldProfit,
      newProfit,
      delta
    };

    // Drawer growth that exceeds recorded revenue cannot have come from sales.
    // Flag it rather than silently overwriting - the underlying rows are wrong.
    const cashDelta = round2((s.end_total || 0) - (s.start_total || 0));
    if (cashDelta > row.revenue + 0.005) {
      row.warning = `drawer grew ${money(cashDelta)} on ${money(row.revenue)} of recorded revenue`;
      suspect.push(row);
    }

    if (delta !== 0) changes.push(row);
  }

  console.log(`\nClosed sessions examined: ${sessions.length}`);
  console.log(`Sessions whose profit changes: ${changes.length}\n`);

  for (const c of changes) {
    console.log(`  #${c.id} ${c.name}`);
    console.log(`      orders ${c.orderCount} | revenue ${money(c.revenue)} | order COGS ${money(c.orderCogs)} | bulk COGS ${money(c.bulkCogs)}`);
    console.log(`      profit ${money(c.oldProfit)} -> ${money(c.newProfit)}  (delta ${money(c.delta)})`);
    if (c.warning) console.log(`      WARNING: ${c.warning}`);
    console.log('');
  }

  const byProgram = {};
  for (const c of changes) {
    if (!c.programId) continue;
    byProgram[c.programId] = round2((byProgram[c.programId] || 0) + c.delta);
  }

  if (Object.keys(byProgram).length) {
    console.log('Program balance adjustments:');
    for (const [programId, delta] of Object.entries(byProgram)) {
      const p = await get('SELECT name, balance FROM cashbox_programs WHERE id = ?', [programId]);
      const from = round2(p?.balance || 0);
      console.log(`  ${p?.name || 'program ' + programId}: ${money(from)} -> ${money(round2(from + delta))}  (delta ${money(delta)})`);
    }
    console.log('');
  }

  if (suspect.length) {
    console.log(`${suspect.length} session(s) flagged above have drawer growth exceeding recorded revenue.`);
    console.log('Their order rows are incomplete, so the recomputed profit is only as good as those rows.\n');
  }

  if (!APPLY) {
    console.log('Dry run - nothing written. Re-run with --apply to commit these changes.');
    return;
  }

  for (const c of changes) {
    await transaction(async ({ run: txRun }) => {
      await txRun('UPDATE concession_sessions SET profit = ? WHERE id = ?', [c.newProfit, c.id]);
      if (c.programId) {
        await txRun(
          'UPDATE cashbox_programs SET balance = balance + ? WHERE id = ?',
          [c.delta, c.programId]
        );
      }
    });
    console.log(`  applied #${c.id} (${money(c.delta)})`);
  }

  console.log(`\nDone. ${changes.length} session(s) updated.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Recompute failed:', err.message);
    process.exit(1);
  });
