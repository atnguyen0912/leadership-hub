/**
 * Session Routes
 *
 * Handles session closing operations with simplified cash counting
 */

const express = require('express');
const router = express.Router();
const { run, get, all, transaction } = require('../db-utils');
const { requirePermission } = require('../middleware/auth');

// POST /api/sessions/:id/close - Close session with simplified cash count
router.post('/:id/close', requirePermission('sessions.close'), async (req, res) => {
  try {
    const { id } = req.params;
    const { actualCashCount, closedBy } = req.body;

    if (actualCashCount === undefined || actualCashCount === null) {
      return res.status(400).json({ error: 'actualCashCount is required' });
    }

    // 1. Verify session exists and is active
    const session = await get(
      `SELECT cs.*, p.name as program_name
       FROM concession_sessions cs
       LEFT JOIN cashbox_programs p ON cs.program_id = p.id
       WHERE cs.id = ?`,
      [id]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // 2. Get the close preview data (reuse logic from close-preview endpoint)

    // Calculate revenue breakdown by payment method
    const revenueBreakdown = await get(
      `SELECT
         COUNT(*) as order_count,
         COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN COALESCE(final_total, subtotal) ELSE 0 END), 0) as cash,
         COALESCE(SUM(CASE WHEN payment_method = 'cashapp' THEN COALESCE(final_total, subtotal) ELSE 0 END), 0) as cashapp,
         COALESCE(SUM(CASE WHEN payment_method = 'zelle' THEN COALESCE(final_total, subtotal) ELSE 0 END), 0) as zelle,
         COALESCE(SUM(COALESCE(final_total, subtotal)), 0) as total
       FROM orders
       WHERE session_id = ?`,
      [id]
    );

    // Calculate COGS (Cost of Goods Sold)
    const cogsResult = await get(
      `SELECT COALESCE(SUM(COALESCE(cogs_total, 0)), 0) as total_cogs
       FROM orders
       WHERE session_id = ?`,
      [id]
    );

    const totalCogs = cogsResult.total_cogs || 0;

    // Calculate profit
    const profit = revenueBreakdown.total - totalCogs;

    // Calculate reimbursement details
    const totalOwed = totalCogs;

    // Get CashApp transactions for this session (auto-reimburse)
    const cashappReimbursement = await get(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM cashapp_transactions
       WHERE session_id = ? AND transaction_type = 'sale'`,
      [id]
    );

    // Get Zelle payments for this session (auto-reimburse)
    const zelleReimbursement = await get(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM zelle_payments
       WHERE session_id = ?`,
      [id]
    );

    const cashappAutoReimbursed = cashappReimbursement.total || 0;
    const zelleAutoReimbursed = zelleReimbursement.total || 0;
    const totalAutoReimbursed = cashappAutoReimbursed + zelleAutoReimbursed;
    const stillOwed = Math.max(0, totalOwed - totalAutoReimbursed);

    // Get starting cash from session record
    const startingCash = {
      quarters: session.start_quarters || 0,
      bills_1: session.start_bills_1 || 0,
      bills_5: session.start_bills_5 || 0,
      bills_10: session.start_bills_10 || 0,
      bills_20: session.start_bills_20 || 0,
      bills_50: session.start_bills_50 || 0,
      bills_100: session.start_bills_100 || 0,
      total: session.start_total || 0
    };

    // Calculate expected cash in drawer
    const expectedCashInDrawer = startingCash.total + (revenueBreakdown.cash || 0);

    // 3. Calculate cash discrepancy
    const discrepancy = actualCashCount - expectedCashInDrawer;

    // 4-6. Use transaction to ensure atomicity
    await transaction(async ({ run: txRun }) => {
      // 4. Create reimbursement ledger entry for COGS owed
      await txRun(
        `INSERT INTO reimbursement_ledger (entry_type, amount, session_id, notes)
         VALUES ('cogs_owed', ?, ?, ?)`,
        [totalCogs, id, `Session close - ${session.name}`]
      );

      // 5. Update program balance with profit
      await txRun(
        `UPDATE cashbox_programs SET balance = balance + ? WHERE id = ?`,
        [profit, session.program_id]
      );

      // 6. Update the session record
      await txRun(
        `UPDATE concession_sessions SET
         status = 'closed',
         end_total = ?,
         profit = ?,
         closed_by = ?,
         closed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [actualCashCount, profit, closedBy || null, id]
      );
    });

    // 7. Return the full breakdown plus discrepancy info
    res.json({
      success: true,
      breakdown: {
        sessionId: session.id,
        sessionName: session.name,
        programName: session.program_name,
        revenue: {
          total: revenueBreakdown.total || 0,
          cash: revenueBreakdown.cash || 0,
          cashapp: revenueBreakdown.cashapp || 0,
          zelle: revenueBreakdown.zelle || 0,
          orderCount: revenueBreakdown.order_count || 0
        },
        costs: {
          totalCogs: totalCogs
        },
        profit: profit,
        reimbursement: {
          totalOwed: totalOwed,
          autoReimbursed: {
            cashapp: cashappAutoReimbursed,
            zelle: zelleAutoReimbursed,
            total: totalAutoReimbursed
          },
          stillOwed: stillOwed
        },
        startingCash: startingCash,
        expectedCashInDrawer: expectedCashInDrawer
      },
      cashReconciliation: {
        expected: expectedCashInDrawer,
        actual: actualCashCount,
        discrepancy: discrepancy
      }
    });
  } catch (err) {
    console.error('Session close error:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// POST /api/sessions/:id/start-inventory - Record starting inventory for a session
router.post('/:id/start-inventory', requirePermission('sessions.run'), async (req, res) => {
  try {
    const { id } = req.params;
    const { verifiedBy, skipVerification, preciseItems, bulkItems } = req.body;

    // Verify session exists and is in created state
    const session = await get('SELECT * FROM concession_sessions WHERE id = ?', [id]);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'created' && session.status !== 'active') {
      return res.status(400).json({ error: 'Session must be in created or active state' });
    }

    if (skipVerification) {
      // Quick start - just mark as not verified
      await run(
        `UPDATE concession_sessions SET
         inventory_verified_at_start = 0,
         status = 'active'
         WHERE id = ?`,
        [id]
      );

      return res.json({
        success: true,
        skipped: true,
        message: 'Session started without inventory verification'
      });
    }

    // Record precise item verifications
    if (preciseItems && Array.isArray(preciseItems)) {
      for (const item of preciseItems) {
        await run(
          `INSERT INTO inventory_verifications
           (menu_item_id, session_id, verification_type, system_quantity, actual_quantity, discrepancy, verified_by)
           VALUES (?, ?, 'start', ?, ?, ?, ?)`,
          [item.menuItemId, id, item.systemQuantity || 0, item.quantity, (item.quantity - (item.systemQuantity || 0)), verifiedBy || '']
        );

        // Update menu item verification tracking
        await run(
          `UPDATE menu_items SET
           quantity_on_hand = ?,
           last_inventory_check = date('now'),
           last_checked_by = ?
           WHERE id = ?`,
          [item.quantity, verifiedBy || '', item.menuItemId]
        );
      }
    }

    // Record bulk item starting containers
    if (bulkItems && Array.isArray(bulkItems)) {
      for (const item of bulkItems) {
        await run(
          `INSERT INTO session_bulk_inventory
           (session_id, menu_item_id, starting_containers, notes)
           VALUES (?, ?, ?, ?)`,
          [id, item.menuItemId, item.startingContainers, item.notes || '']
        );
      }
    }

    // Mark session as verified at start
    await run(
      `UPDATE concession_sessions SET
       inventory_verified_at_start = 1,
       start_verified_by = ?,
       status = 'active'
       WHERE id = ?`,
      [verifiedBy || '', id]
    );

    res.json({
      success: true,
      verified: true,
      preciseItemsCount: preciseItems?.length || 0,
      bulkItemsCount: bulkItems?.length || 0
    });
  } catch (err) {
    console.error('Start inventory error:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// POST /api/sessions/:id/end-inventory - Record ending inventory for session close
router.post('/:id/end-inventory', requirePermission('sessions.close'), async (req, res) => {
  try {
    const { id } = req.params;
    const { verifiedBy, skipVerification, preciseItems, bulkItems } = req.body;

    // Verify session exists and is active
    const session = await get('SELECT * FROM concession_sessions WHERE id = ?', [id]);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session must be active' });
    }

    if (skipVerification) {
      // Quick close - just mark as not verified
      await run(
        `UPDATE concession_sessions SET inventory_verified_at_end = 0 WHERE id = ?`,
        [id]
      );

      return res.json({
        success: true,
        skipped: true,
        message: 'Inventory verification skipped'
      });
    }

    const discrepancies = [];

    // Record precise item verifications
    if (preciseItems && Array.isArray(preciseItems)) {
      for (const item of preciseItems) {
        const discrepancy = item.actual - item.expected;

        await run(
          `INSERT INTO inventory_verifications
           (menu_item_id, session_id, verification_type, system_quantity, actual_quantity, discrepancy, verified_by, notes)
           VALUES (?, ?, 'end', ?, ?, ?, ?, ?)`,
          [item.menuItemId, id, item.expected, item.actual, discrepancy, verifiedBy || '', item.notes || '']
        );

        // Update menu item with actual quantity
        await run(
          `UPDATE menu_items SET
           quantity_on_hand = ?,
           last_inventory_check = date('now'),
           last_checked_by = ?
           WHERE id = ?`,
          [item.actual, verifiedBy || '', item.menuItemId]
        );

        if (discrepancy !== 0) {
          // Get item details for discrepancy report
          const menuItem = await get('SELECT name, unit_cost FROM menu_items WHERE id = ?', [item.menuItemId]);
          discrepancies.push({
            menuItemId: item.menuItemId,
            name: menuItem?.name || 'Unknown',
            expected: item.expected,
            actual: item.actual,
            discrepancy,
            reason: item.reason || null,
            costImpact: discrepancy * (menuItem?.unit_cost || 0)
          });

          // Create loss record if reason provided and discrepancy is negative
          if (item.reason && discrepancy < 0) {
            await run(
              `INSERT INTO losses (session_id, loss_type, amount, description, recorded_by, created_by)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [id, item.reason, Math.abs(discrepancy * (menuItem?.unit_cost || 0)),
               `Session close: ${menuItem?.name || 'Unknown'} - expected ${item.expected}, actual ${item.actual}`,
               verifiedBy || '', verifiedBy || '']
            );
          }
        }
      }
    }

    // Update bulk item ending containers
    if (bulkItems && Array.isArray(bulkItems)) {
      for (const item of bulkItems) {
        const containersUsed = (item.startingContainers || 0) - item.endingContainers;

        await run(
          `UPDATE session_bulk_inventory SET
           ending_containers = ?,
           containers_used = ?,
           notes = COALESCE(notes || ' ', '') || ?,
           updated_at = CURRENT_TIMESTAMP
           WHERE session_id = ? AND menu_item_id = ?`,
          [item.endingContainers, containersUsed, item.notes || '', id, item.menuItemId]
        );

        // Update menu item quantity to reflect containers remaining
        await run(
          `UPDATE menu_items SET
           quantity_on_hand = ?,
           last_inventory_check = date('now'),
           last_checked_by = ?
           WHERE id = ?`,
          [item.endingContainers, verifiedBy || '', item.menuItemId]
        );
      }
    }

    // Mark session as verified at end
    await run(
      `UPDATE concession_sessions SET
       inventory_verified_at_end = 1,
       end_verified_by = ?
       WHERE id = ?`,
      [verifiedBy || '', id]
    );

    res.json({
      success: true,
      verified: true,
      preciseItemsCount: preciseItems?.length || 0,
      bulkItemsCount: bulkItems?.length || 0,
      discrepancies,
      discrepancyCount: discrepancies.length,
      totalDiscrepancyCost: discrepancies.reduce((sum, d) => sum + d.costImpact, 0)
    });
  } catch (err) {
    console.error('End inventory error:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// GET /api/sessions/:id/bulk-inventory - Get bulk inventory for a session
router.get('/:id/bulk-inventory', async (req, res) => {
  try {
    const { id } = req.params;

    const bulkItems = await all(
      `SELECT sbi.*, mi.name, mi.container_name, mi.servings_per_container, mi.cost_per_container
       FROM session_bulk_inventory sbi
       JOIN menu_items mi ON sbi.menu_item_id = mi.id
       WHERE sbi.session_id = ?
       ORDER BY mi.name`,
      [id]
    );

    res.json(bulkItems);
  } catch (err) {
    console.error('Get bulk inventory error:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

module.exports = router;
