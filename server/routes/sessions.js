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

module.exports = router;
