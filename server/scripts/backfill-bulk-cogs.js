/**
 * Re-cost historical orders after an ingredient was converted to bulk.
 *
 * Orders rung before the conversion still carry the old per-serving charge - a
 * whole jar of cheese on every nacho. This recomputes each affected order's COGS
 * from its recipe EXCLUDING bulk components, books one whole container per session
 * that used the bulk item, then moves session profit, the program balance and the
 * reimbursement ledger by the difference.
 *
 * Non-bulk components are costed from menu_items.unit_cost - the same basis
 * recalculate-cogs already uses, and the basis that produced the current figures.
 *
 * Dry run by default - prints what would change and writes nothing.
 *
 *   node server/scripts/backfill-bulk-cogs.js Cheese
 *   node server/scripts/backfill-bulk-cogs.js Cheese --apply
 */

const database = require('../database');
const { run, get, all, transaction } = require('../db-utils');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const nameArg = args.find((a) => !a.startsWith('--'));
const r2 = (n) => Math.round((n || 0) * 100) / 100;
const m = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(r2(n)).toFixed(2);

async function main() {
  if (!nameArg) {
    console.error('Usage: node server/scripts/backfill-bulk-cogs.js <bulk item name> [--apply]');
    process.exit(1);
  }
  await database.initialize();
  await new Promise((r) => setTimeout(r, 3000));

  const bulk = await get(
    `SELECT id, name, item_type, COALESCE(cost_per_container, unit_cost, 0) as cost_per_container,
            COALESCE(servings_per_container, 0) as servings_per_container
     FROM menu_items WHERE name = ?`,
    [nameArg]
  );
  if (!bulk) { console.error(`No menu item named "${nameArg}".`); process.exit(1); }
  if (bulk.item_type !== 'bulk_ingredient') {
    console.error(`"${bulk.name}" is ${bulk.item_type}, not bulk_ingredient.`);
    console.error('Run convert-to-bulk-ingredient.js first.');
    process.exit(1);
  }

  const cols = await all('PRAGMA table_info(menu_item_components)');
  const names = (cols || []).map((c) => c.name);
  const parent = names.includes('menu_item_id') ? 'menu_item_id' : 'composite_item_id';
  const qty = names.includes('quantity') ? 'quantity' : 'quantity_required';

  // Sessions containing any order that sold a composite using this bulk item
  const sessions = await all(
    `SELECT DISTINCT cs.id, cs.name, cs.status, cs.program_id,
            COALESCE(cs.bulk_cogs, 0) as bulk_cogs, COALESCE(cs.profit, 0) as profit
     FROM concession_sessions cs
     JOIN orders o ON o.session_id = cs.id
     JOIN order_items oi ON oi.order_id = o.id
     WHERE oi.menu_item_id IN (SELECT ${parent} FROM menu_item_components WHERE component_item_id = ?)
     ORDER BY cs.id`,
    [bulk.id]
  );

  const plan = [];

  for (const s of sessions) {
    // Recompute COGS for every already-costed order in this session, excluding bulk
    const orders = await all(
      `SELECT id, COALESCE(cogs_total, 0) as cogs_total, COALESCE(cogs_reimbursable, 0) as cogs_reimbursable
       FROM orders WHERE session_id = ? AND COALESCE(cogs_total, 0) > 0`,
      [s.id]
    );

    const orderUpdates = [];
    let oldOrderCogs = 0, newOrderCogs = 0;

    for (const o of orders) {
      const items = await all(
        `SELECT oi.menu_item_id, oi.quantity, mi.item_type, mi.is_composite, COALESCE(mi.unit_cost, 0) as unit_cost
         FROM order_items oi JOIN menu_items mi ON mi.id = oi.menu_item_id
         WHERE oi.order_id = ?`,
        [o.id]
      );

      let recomputed = 0;
      for (const it of items) {
        if (it.item_type === 'composite' || it.is_composite === 1) {
          const comps = await all(
            `SELECT mc.${qty} as qty, mc.is_bulk, c.item_type, COALESCE(c.unit_cost, 0) as unit_cost
             FROM menu_item_components mc JOIN menu_items c ON c.id = mc.component_item_id
             WHERE mc.${parent} = ?`,
            [it.menu_item_id]
          );
          for (const c of comps) {
            if (c.is_bulk === 1 || c.item_type === 'bulk_ingredient') continue; // charged per session
            recomputed += (c.qty || 1) * it.quantity * c.unit_cost;
          }
        } else {
          recomputed += it.quantity * it.unit_cost;
        }
      }

      oldOrderCogs += o.cogs_total;
      newOrderCogs += recomputed;
      if (r2(recomputed) !== r2(o.cogs_total)) {
        orderUpdates.push({ id: o.id, from: r2(o.cogs_total), to: r2(recomputed) });
      }
    }

    // Whole containers for the session
    const servings = await get(
      `SELECT COALESCE(SUM(oi.quantity * COALESCE(mc.${qty}, 1)), 0) as servings
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN menu_item_components mc ON mc.${parent} = oi.menu_item_id
       WHERE o.session_id = ? AND mc.component_item_id = ?`,
      [s.id, bulk.id]
    );
    const containers = bulk.servings_per_container > 0
      ? Math.max(1, Math.ceil(servings.servings / bulk.servings_per_container))
      : (servings.servings > 0 ? 1 : 0);
    const newBulkCogs = r2(containers * bulk.cost_per_container);

    const rev = await get(
      `SELECT COALESCE(SUM(COALESCE(final_total, subtotal)), 0) as revenue FROM orders WHERE session_id = ?`,
      [s.id]
    );
    // Include orders left at zero COGS (still pending) so totals match the close formula
    const untouched = await get(
      `SELECT COALESCE(SUM(COALESCE(cogs_total, 0)), 0) as c FROM orders WHERE session_id = ? AND COALESCE(cogs_total,0) <= 0`,
      [s.id]
    );

    const newProfit = r2(rev.revenue - (newOrderCogs + untouched.c + newBulkCogs));
    plan.push({
      ...s, orderUpdates,
      oldOrderCogs: r2(oldOrderCogs), newOrderCogs: r2(newOrderCogs),
      oldBulkCogs: r2(s.bulk_cogs), newBulkCogs, servings: servings.servings, containers,
      revenue: r2(rev.revenue), oldProfit: r2(s.profit), newProfit,
      profitDelta: r2(newProfit - s.profit),
      cogsOwedDelta: r2(newOrderCogs - oldOrderCogs)
    });
  }

  console.log(`\nBulk item: ${bulk.name} at ${m(bulk.cost_per_container)} per container` +
              (bulk.servings_per_container > 0 ? `, ${bulk.servings_per_container} servings each` : ', one container per day of use'));
  console.log(`Sessions affected: ${plan.length}\n`);

  for (const p of plan) {
    console.log(`  #${p.id} ${p.name} (${p.status})`);
    console.log(`      revenue ${m(p.revenue)} | ${p.servings} servings -> ${p.containers} container(s)`);
    console.log(`      order COGS  ${m(p.oldOrderCogs)} -> ${m(p.newOrderCogs)}   (${p.orderUpdates.length} order rows)`);
    console.log(`      bulk COGS   ${m(p.oldBulkCogs)} -> ${m(p.newBulkCogs)}`);
    if (p.status === 'closed') {
      console.log(`      profit      ${m(p.oldProfit)} -> ${m(p.newProfit)}   (delta ${m(p.profitDelta)})`);
    } else {
      console.log(`      profit      session still open - books ${m(p.newProfit)} at close`);
    }
    console.log('');
  }

  if (!APPLY) { console.log('Dry run - nothing written. Re-run with --apply to commit.\n'); return; }

  for (const p of plan) {
    await transaction(async ({ run: txRun }) => {
      for (const u of p.orderUpdates) {
        await txRun('UPDATE orders SET cogs_total = ?, cogs_reimbursable = ? WHERE id = ?', [u.to, u.to, u.id]);
      }
      await txRun('UPDATE concession_sessions SET bulk_cogs = ?, bulk_cogs_source = ? WHERE id = ?',
        [p.newBulkCogs, 'estimated', p.id]);

      if (p.status === 'closed') {
        await txRun('UPDATE concession_sessions SET profit = ? WHERE id = ?', [p.newProfit, p.id]);
        if (p.profitDelta !== 0 && p.program_id) {
          await txRun('UPDATE cashbox_programs SET balance = balance + ? WHERE id = ?', [p.profitDelta, p.program_id]);
        }
        if (Math.abs(p.cogsOwedDelta) > 0.005) {
          await txRun(
            `INSERT INTO reimbursement_ledger (entry_type, amount, session_id, notes)
             VALUES ('cogs_owed', ?, ?, 'Bulk re-costing adjustment')`,
            [p.cogsOwedDelta, p.id]
          );
        }
      }
    });
    console.log(`  applied #${p.id} (${p.status === 'closed' ? 'profit ' + m(p.profitDelta) : 'open session re-costed'})`);
  }
  console.log(`\nDone. ${plan.length} session(s) updated.\n`);
}

main().then(() => process.exit(0)).catch((e) => { console.error('Backfill failed:', e.message); process.exit(1); });
