/**
 * Convert a precise ingredient into a bulk ingredient.
 *
 * A precise ingredient is deducted per sale at its full unit_cost, which is right
 * for buns and wieners but wrong for anything bought by the jar: every nacho sale
 * was charging a whole $13.46 tub of cheese. A bulk ingredient is skipped during
 * per-sale deduction and charged once per session, in whole containers, because an
 * opened jar is consumed by the day whether or not it is emptied.
 *
 * Dry run by default - prints what would change and writes nothing.
 *
 *   node server/scripts/convert-to-bulk-ingredient.js Cheese
 *   node server/scripts/convert-to-bulk-ingredient.js Cheese --servings 40
 *   node server/scripts/convert-to-bulk-ingredient.js Cheese --apply
 *
 * --servings N  sets servings_per_container, so a day that gets through more than
 *               one container is charged for each. Omit it and any day of use
 *               costs exactly one container.
 */

const database = require('../database');
const { run, get, all, transaction } = require('../db-utils');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const nameArg = args.find((a) => !a.startsWith('--'));
const servingsIdx = args.indexOf('--servings');
const SERVINGS = servingsIdx !== -1 ? parseFloat(args[servingsIdx + 1]) : null;

const money = (n) => '$' + (n || 0).toFixed(2);

async function main() {
  if (!nameArg) {
    console.error('Usage: node server/scripts/convert-to-bulk-ingredient.js <item name> [--servings N] [--apply]');
    process.exit(1);
  }

  await database.initialize();
  await new Promise((r) => setTimeout(r, 3000)); // migrations run detached

  const item = await get(
    `SELECT id, name, item_type, unit_cost, cost_per_container, servings_per_container, container_name
     FROM menu_items WHERE name = ?`,
    [nameArg]
  );

  if (!item) {
    console.error(`No menu item named "${nameArg}".`);
    process.exit(1);
  }

  // cost_per_container is what a jar costs - the existing unit_cost already is that,
  // it was just being applied per serving instead of per jar.
  const costPerContainer = item.cost_per_container || item.unit_cost || 0;

  console.log(`\n${item.name} (id ${item.id})`);
  console.log(`  item_type              ${item.item_type}  ->  bulk_ingredient`);
  console.log(`  cost_per_container     ${item.cost_per_container === null ? '(unset)' : money(item.cost_per_container)}  ->  ${money(costPerContainer)}`);
  console.log(`  servings_per_container ${item.servings_per_container === null ? '(unset)' : item.servings_per_container}  ->  ${SERVINGS || '(unset - one container per day of use)'}`);
  console.log(`  unit_cost              ${money(item.unit_cost)}  ->  0.00  (no longer charged per sale)`);

  // Every recipe that uses it must be flagged bulk, or per-sale deduction still runs.
  const cols = await all('PRAGMA table_info(menu_item_components)');
  const names = (cols || []).map((c) => c.name);
  const parentCol = names.includes('menu_item_id') ? 'menu_item_id' : 'composite_item_id';

  const recipes = await all(
    `SELECT mc.id, p.name as parent, p.price, mc.is_bulk
     FROM menu_item_components mc
     JOIN menu_items p ON p.id = mc.${parentCol}
     WHERE mc.component_item_id = ?`,
    [item.id]
  );

  console.log(`\n  Recipes using it: ${recipes.length}`);
  for (const r of recipes) {
    console.log(`    ${r.parent} (sells ${money(r.price)}) - is_bulk ${r.is_bulk} -> 1`);
  }

  // What this would have cost historically, per session, under whole-container charging.
  const sessions = await all(
    `SELECT o.session_id, cs.name, cs.status, SUM(oi.quantity) as servings
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN concession_sessions cs ON cs.id = o.session_id
     WHERE oi.menu_item_id IN (SELECT ${parentCol} FROM menu_item_components WHERE component_item_id = ?)
     GROUP BY o.session_id ORDER BY o.session_id`,
    [item.id]
  );

  if (sessions.length) {
    console.log(`\n  Sessions that used it, charged in whole containers:`);
    let total = 0;
    for (const s of sessions) {
      const containers = SERVINGS > 0 ? Math.max(1, Math.ceil(s.servings / SERVINGS)) : 1;
      const cost = containers * costPerContainer;
      total += cost;
      console.log(`    #${s.session_id} ${s.name} (${s.status}) - ${s.servings} servings -> ${containers} container(s) = ${money(cost)}`);
    }
    console.log(`    ${''.padEnd(40, '-')}`);
    console.log(`    Total bulk cost across those sessions: ${money(total)}`);
  }

  if (!APPLY) {
    console.log('\nDry run - nothing written. Re-run with --apply to commit.\n');
    return;
  }

  await transaction(async ({ run: txRun }) => {
    await txRun(
      `UPDATE menu_items SET
         item_type = 'bulk_ingredient',
         cost_per_container = ?,
         servings_per_container = ?,
         container_name = COALESCE(container_name, 'container'),
         unit_cost = 0
       WHERE id = ?`,
      [costPerContainer, SERVINGS || null, item.id]
    );
    await txRun(
      'UPDATE menu_item_components SET is_bulk = 1 WHERE component_item_id = ?',
      [item.id]
    );
  });

  console.log(`\nApplied. ${item.name} is now a bulk ingredient at ${money(costPerContainer)} per container.`);
  console.log('Per-sale deduction will skip it; cost is booked once per session at close.\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Conversion failed:', err.message);
    process.exit(1);
  });
