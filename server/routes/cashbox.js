/**
 * Cashbox Routes
 * 
 * Handles all cashbox operations including:
 * - Main cashbox balance management
 * - Program management
 * - Concession session lifecycle
 * 
 * This file has been updated to use shared helper functions from utils/helpers.js
 * instead of defining them inline, making the code cleaner and more maintainable.
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { run, get, all, transaction } = require('../db-utils');
const { requirePermission } = require('../middleware/auth');

// Import shared helper functions
const { calculateTotal, hasPermission, validateDenominations } = require('../utils/helpers');

// ==================== MAIN CASHBOX ====================

// GET /api/cashbox - Get current cashbox state (requires cashbox.view permission)
router.get('/', requirePermission('cashbox.view'), (req, res) => {
  const db = getDb();
  db.get('SELECT * FROM cashbox WHERE id = 1', [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Cashbox not found' });
    }
    // Use shared calculateTotal function
    const totalValue = calculateTotal(row);
    res.json({ ...row, totalValue });
  });
});

// POST /api/cashbox/update - Admin manually updates main cashbox (requires cashbox.manage)
router.post('/update', requirePermission('cashbox.manage'), (req, res) => {
  const {
    quarters = 0,
    bills_1 = 0,
    bills_5 = 0,
    bills_10 = 0,
    bills_20 = 0,
    bills_50 = 0,
    bills_100 = 0
  } = req.body;

  // Use shared validation function
  if (!validateDenominations({ quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100 })) {
    return res.status(400).json({ error: 'Denomination counts cannot be negative' });
  }

  const db = getDb();
  db.run(
    `UPDATE cashbox SET
     quarters = ?, bills_1 = ?, bills_5 = ?, bills_10 = ?, bills_20 = ?, bills_50 = ?, bills_100 = ?,
     updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      // Use shared calculateTotal function
      const totalValue = calculateTotal({ quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100 });
      res.json({ success: true, totalValue });
    }
  );
});

// ==================== PROGRAMS ====================

// GET /api/cashbox/programs - Get all programs
router.get('/programs', (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM cashbox_programs WHERE active = 1 ORDER BY name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// POST /api/cashbox/programs - Create a new program (Admin)
router.post('/programs', (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Program name is required' });
  }

  const db = getDb();
  db.run(
    'INSERT INTO cashbox_programs (name) VALUES (?)',
    [name.trim()],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Program name already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// GET /api/cashbox/programs/:id - Get program details with earnings
router.get('/programs/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  db.get(
    `SELECT p.*, COALESCE(SUM(pe.amount), 0) as total_earnings
     FROM cashbox_programs p
     LEFT JOIN program_earnings pe ON p.id = pe.program_id
     WHERE p.id = ?
     GROUP BY p.id`,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Program not found' });
      }

      // Get earnings history
      db.all(
        `SELECT pe.*, cs.name as session_name
         FROM program_earnings pe
         LEFT JOIN concession_sessions cs ON pe.session_id = cs.id
         WHERE pe.program_id = ?
         ORDER BY pe.created_at DESC`,
        [id],
        (err, history) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ ...row, earnings_history: history });
        }
      );
    }
  );
});

// GET /api/cashbox/programs/earnings - Get all programs with earnings
router.get('/programs/earnings', (req, res) => {
  const db = getDb();
  db.all(
    `SELECT p.*, COALESCE(SUM(pe.amount), 0) as total_earnings
     FROM cashbox_programs p
     LEFT JOIN program_earnings pe ON p.id = pe.program_id
     WHERE p.active = 1
     GROUP BY p.id
     ORDER BY p.name`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// ==================== CONCESSION SESSIONS ====================

// GET /api/cashbox/sessions - List all sessions
router.get('/sessions', (req, res) => {
  const { status, programId, limit = 50, offset = 0 } = req.query;
  const db = getDb();

  let query = `
    SELECT cs.*, p.name as program_name
    FROM concession_sessions cs
    LEFT JOIN cashbox_programs p ON cs.program_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND cs.status = ?';
    params.push(status);
  }
  if (programId) {
    query += ' AND cs.program_id = ?';
    params.push(programId);
  }

  query += ' ORDER BY cs.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// GET /api/cashbox/sessions/active - List active/created sessions (any authenticated user)
router.get('/sessions/active', (req, res) => {
  const db = getDb();
  db.all(
    `SELECT cs.*, p.name as program_name
     FROM concession_sessions cs
     LEFT JOIN cashbox_programs p ON cs.program_id = p.id
     WHERE cs.status IN ('created', 'active')
     ORDER BY cs.created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// GET /api/cashbox/sessions/:id - Get session details (requires sessions.run)
router.get('/sessions/:id', requirePermission('sessions.run'), (req, res) => {
  const { id } = req.params;
  const db = getDb();

  db.get(
    `SELECT cs.*, p.name as program_name
     FROM concession_sessions cs
     LEFT JOIN cashbox_programs p ON cs.program_id = p.id
     WHERE cs.id = ?`,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json(row);
    }
  );
});

// GET /api/cashbox/sessions/:id/close-preview - Get detailed breakdown for closing a session
router.get('/sessions/:id/close-preview', requirePermission('sessions.run'), async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch the session by ID and verify it's active
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

    // 2. Calculate revenue breakdown by payment method
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

    // 3. Calculate COGS (Cost of Goods Sold)
    const cogsResult = await get(
      `SELECT COALESCE(SUM(COALESCE(cogs_total, 0)), 0) as total_cogs
       FROM orders
       WHERE session_id = ?`,
      [id]
    );

    const totalCogs = cogsResult.total_cogs || 0;

    // 4. Calculate profit
    const profit = revenueBreakdown.total - totalCogs;

    // 5. Calculate reimbursement details
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

    // 6. Get starting cash from session record
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

    // Return the formatted response
    res.json({
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
    });
  } catch (err) {
    console.error('Session close preview error:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// POST /api/cashbox/sessions - Create new session (requires sessions.create)
router.post('/sessions', requirePermission('sessions.create'), (req, res) => {
  const { name, programId, createdBy, isTest = false } = req.body;

  if (!name || !programId) {
    return res.status(400).json({ error: 'Session name and program are required' });
  }

  const db = getDb();
  db.run(
    'INSERT INTO concession_sessions (name, program_id, created_by, is_test) VALUES (?, ?, ?, ?)',
    [name, programId, createdBy || null, isTest ? 1 : 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, id: this.lastID, status: 'created' });
    }
  );
});

// POST /api/cashbox/sessions/:id/start - Start session with initial cash (requires sessions.start)
router.post('/sessions/:id/start', requirePermission('sessions.start'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      quarters = 0,
      bills_1 = 0,
      bills_5 = 0,
      bills_10 = 0,
      bills_20 = 0,
      bills_50 = 0,
      bills_100 = 0,
      startedBy
    } = req.body;

    // Use shared validation function
    if (!validateDenominations({ quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100 })) {
      return res.status(400).json({ error: 'Denomination counts cannot be negative' });
    }

    // Get the session
    const session = await get('SELECT * FROM concession_sessions WHERE id = ?', [id]);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.status !== 'created') {
      return res.status(400).json({ error: 'Session has already been started or closed' });
    }

    // Use shared calculateTotal function
    const startTotal = calculateTotal({ quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100 });

    // For test sessions, skip cashbox deduction
    if (session.is_test) {
      await run(
        `UPDATE concession_sessions SET
         status = 'active',
         start_quarters = ?,
         start_bills_1 = ?,
         start_bills_5 = ?,
         start_bills_10 = ?,
         start_bills_20 = ?,
         start_bills_50 = ?,
         start_bills_100 = ?,
         start_total = ?,
         started_by = ?,
         started_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100, startTotal, startedBy || null, id]
      );
      return res.json({ success: true, status: 'active', startTotal, isTest: true });
    }

    // For real sessions, verify and deduct from main cashbox atomically
    const cashbox = await get('SELECT * FROM cashbox WHERE id = 1', []);

    // Verify sufficient funds in main cashbox
    if (
      cashbox.quarters < quarters ||
      cashbox.bills_1 < bills_1 ||
      cashbox.bills_5 < bills_5 ||
      cashbox.bills_10 < bills_10 ||
      cashbox.bills_20 < bills_20 ||
      cashbox.bills_50 < bills_50 ||
      cashbox.bills_100 < bills_100
    ) {
      return res.status(400).json({ error: 'Insufficient funds in main cashbox' });
    }

    // Use transaction to ensure atomicity
    await transaction(async ({ run: txRun }) => {
      // Subtract from main cashbox
      await txRun(
        `UPDATE cashbox SET
         quarters = quarters - ?,
         bills_1 = bills_1 - ?,
         bills_5 = bills_5 - ?,
         bills_10 = bills_10 - ?,
         bills_20 = bills_20 - ?,
         bills_50 = bills_50 - ?,
         bills_100 = bills_100 - ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
        [quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100]
      );

      // Update session with starting cash
      await txRun(
        `UPDATE concession_sessions SET
         status = 'active',
         start_quarters = ?,
         start_bills_1 = ?,
         start_bills_5 = ?,
         start_bills_10 = ?,
         start_bills_20 = ?,
         start_bills_50 = ?,
         start_bills_100 = ?,
         start_total = ?,
         started_by = ?,
         started_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100, startTotal, startedBy || null, id]
      );
    });

    res.json({ success: true, status: 'active', startTotal });
  } catch (err) {
    console.error('Session start error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/cashbox/sessions/:id/close - Close session with ending cash (requires sessions.close)
router.post('/sessions/:id/close', requirePermission('sessions.close'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      quarters = 0,
      bills_1 = 0,
      bills_5 = 0,
      bills_10 = 0,
      bills_20 = 0,
      bills_50 = 0,
      bills_100 = 0,
      closedBy
    } = req.body;

    // Use shared validation function
    if (!validateDenominations({ quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100 })) {
      return res.status(400).json({ error: 'Denomination counts cannot be negative' });
    }

    // Get the session
    const session = await get('SELECT * FROM concession_sessions WHERE id = ?', [id]);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Use shared calculateTotal function
    const endTotal = calculateTotal({ quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100 });
    const profit = endTotal - session.start_total;

    // Use transaction to ensure atomicity
    await transaction(async ({ run: txRun }) => {
      // Add ending cash back to main cashbox
      await txRun(
        `UPDATE cashbox SET
         quarters = quarters + ?,
         bills_1 = bills_1 + ?,
         bills_5 = bills_5 + ?,
         bills_10 = bills_10 + ?,
         bills_20 = bills_20 + ?,
         bills_50 = bills_50 + ?,
         bills_100 = bills_100 + ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
        [quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100]
      );

      // Update session with ending cash
      await txRun(
        `UPDATE concession_sessions SET
         status = 'closed',
         end_quarters = ?,
         end_bills_1 = ?,
         end_bills_5 = ?,
         end_bills_10 = ?,
         end_bills_20 = ?,
         end_bills_50 = ?,
         end_bills_100 = ?,
         end_total = ?,
         profit = ?,
         closed_by = ?,
         closed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100, endTotal, profit, closedBy || null, id]
      );

      // Record profit to program earnings
      await txRun(
        'INSERT INTO program_earnings (program_id, session_id, amount) VALUES (?, ?, ?)',
        [session.program_id, id, profit]
      );
    });

    res.json({ success: true, status: 'closed', endTotal, profit });
  } catch (err) {
    console.error('Session close error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/cashbox/sessions/:id/cancel - Cancel session (Admin)
router.post('/sessions/:id/cancel', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  db.get('SELECT * FROM concession_sessions WHERE id = ?', [id], (err, session) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.status === 'closed' || session.status === 'cancelled') {
      return res.status(400).json({ error: 'Session is already closed or cancelled' });
    }

    // If session was active, return starting cash to main cashbox
    if (session.status === 'active') {
      db.run(
        `UPDATE cashbox SET
         quarters = quarters + ?,
         bills_1 = bills_1 + ?,
         bills_5 = bills_5 + ?,
         bills_10 = bills_10 + ?,
         bills_20 = bills_20 + ?,
         bills_50 = bills_50 + ?,
         bills_100 = bills_100 + ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
        [
          session.start_quarters,
          session.start_bills_1,
          session.start_bills_5,
          session.start_bills_10,
          session.start_bills_20,
          session.start_bills_50,
          session.start_bills_100
        ],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          updateSessionToCancelled();
        }
      );
    } else {
      updateSessionToCancelled();
    }

    function updateSessionToCancelled() {
      db.run(
        "UPDATE concession_sessions SET status = 'cancelled' WHERE id = ?",
        [id],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ success: true, status: 'cancelled' });
        }
      );
    }
  });
});

// POST /api/cashbox/sessions/:id/end-practice - End and cleanup practice session
router.post('/sessions/:id/end-practice', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  db.get('SELECT * FROM concession_sessions WHERE id = ?', [id], (err, session) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (!session.is_test) {
      return res.status(400).json({ error: 'This endpoint is only for practice sessions' });
    }
    if (session.status === 'closed' || session.status === 'cancelled') {
      return res.status(400).json({ error: 'Session is already closed or cancelled' });
    }

    // Get all orders for this session
    db.all('SELECT id FROM orders WHERE session_id = ?', [id], (err, orders) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const orderIds = orders.map(o => o.id);

      // Delete order_items for all orders
      if (orderIds.length > 0) {
        const placeholders = orderIds.map(() => '?').join(',');
        db.run(
          `DELETE FROM order_items WHERE order_id IN (${placeholders})`,
          orderIds,
          (err) => {
            if (err) console.error('Error deleting order items:', err);
          }
        );
      }

      // Delete all orders
      db.run('DELETE FROM orders WHERE session_id = ?', [id], (err) => {
        if (err) console.error('Error deleting orders:', err);

        // Delete the session
        db.run('DELETE FROM concession_sessions WHERE id = ?', [id], (err) => {
          if (err) {
            return res.status(500).json({ error: 'Database error deleting session' });
          }
          res.json({
            success: true,
            message: 'Practice session ended and all data cleared',
            ordersDeleted: orderIds.length
          });
        });
      });
    });
  });
});

module.exports = router;
