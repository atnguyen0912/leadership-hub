const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// Helper function to calculate total value from denomination counts
const calculateTotal = (row, prefix = '') => {
  const p = prefix ? prefix + '_' : '';
  return (
    (row[p + 'quarters'] || row.quarters || 0) * 0.25 +
    (row[p + 'bills_1'] || row.bills_1 || 0) * 1 +
    (row[p + 'bills_5'] || row.bills_5 || 0) * 5 +
    (row[p + 'bills_10'] || row.bills_10 || 0) * 10 +
    (row[p + 'bills_20'] || row.bills_20 || 0) * 20 +
    (row[p + 'bills_50'] || row.bills_50 || 0) * 50 +
    (row[p + 'bills_100'] || row.bills_100 || 0) * 100
  );
};

// ==================== MAIN CASHBOX ====================

// GET /api/cashbox - Get current cashbox state
router.get('/', (req, res) => {
  const db = getDb();
  db.get('SELECT * FROM cashbox WHERE id = 1', [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Cashbox not found' });
    }
    const totalValue = calculateTotal(row);
    res.json({ ...row, totalValue });
  });
});

// POST /api/cashbox/update - Admin manually updates main cashbox
router.post('/update', (req, res) => {
  const {
    quarters = 0,
    bills_1 = 0,
    bills_5 = 0,
    bills_10 = 0,
    bills_20 = 0,
    bills_50 = 0,
    bills_100 = 0
  } = req.body;

  // Validate non-negative
  if (quarters < 0 || bills_1 < 0 || bills_5 < 0 || bills_10 < 0 || bills_20 < 0 || bills_50 < 0 || bills_100 < 0) {
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
    function (err) {
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

// PUT /api/cashbox/programs/:id - Update a program (Admin)
router.put('/programs/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Program name is required' });
  }

  const db = getDb();
  db.run(
    'UPDATE cashbox_programs SET name = ? WHERE id = ?',
    [name.trim(), id],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Program name already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Program not found' });
      }
      res.json({ success: true });
    }
  );
});

// DELETE /api/cashbox/programs/:id - Deactivate a program (Admin)
router.delete('/programs/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  db.run(
    'UPDATE cashbox_programs SET active = 0 WHERE id = ?',
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Program not found' });
      }
      res.json({ success: true });
    }
  );
});

// POST /api/cashbox/programs/:id/transaction - Withdraw or deposit to a program (Admin)
router.post('/programs/:id/transaction', (req, res) => {
  const { id } = req.params;
  const { type, amount, description } = req.body;

  if (!type || !['withdraw', 'deposit'].includes(type)) {
    return res.status(400).json({ error: 'Transaction type must be "withdraw" or "deposit"' });
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  const db = getDb();

  // Verify program exists
  db.get('SELECT * FROM cashbox_programs WHERE id = ?', [id], (err, program) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // For withdrawals, check current earnings
    if (type === 'withdraw') {
      db.get(
        'SELECT COALESCE(SUM(amount), 0) as total FROM program_earnings WHERE program_id = ?',
        [id],
        (err, row) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          if (row.total < numAmount) {
            return res.status(400).json({ error: `Insufficient funds. Available: $${row.total.toFixed(2)}` });
          }
          recordTransaction(-numAmount);
        }
      );
    } else {
      recordTransaction(numAmount);
    }

    function recordTransaction(adjustedAmount) {
      // Create a manual adjustment entry in program_earnings
      // We'll use session_id = 0 or create a special "manual" entry
      db.run(
        `INSERT INTO program_earnings (program_id, session_id, amount, created_at)
         VALUES (?, 0, ?, CURRENT_TIMESTAMP)`,
        [id, adjustedAmount],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          // Get new total
          db.get(
            'SELECT COALESCE(SUM(amount), 0) as total FROM program_earnings WHERE program_id = ?',
            [id],
            (err, row) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }
              res.json({
                success: true,
                type,
                amount: numAmount,
                newTotal: row.total,
                description: description || (type === 'withdraw' ? 'Manual withdrawal' : 'Manual deposit')
              });
            }
          );
        }
      );
    }
  });
});

// GET /api/cashbox/programs/:id/earnings - Get program's total earnings
router.get('/programs/:id/earnings', (req, res) => {
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

      // Get earnings history (include manual adjustments where session_id = 0)
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

// GET /api/cashbox/sessions/active - List active/created sessions
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

// GET /api/cashbox/sessions/:id - Get session details
router.get('/sessions/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  db.get(
    `SELECT cs.*, p.name as program_name
     FROM concession_sessions cs
     LEFT JOIN cashbox_programs p ON cs.program_id = p.id
     WHERE cs.id = ?`,
    [id],
    (err, session) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json(session);
    }
  );
});

// POST /api/cashbox/sessions - Create new session (Admin)
router.post('/sessions', (req, res) => {
  const { name, programId, createdBy, isTest = false } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Session name is required' });
  }
  if (!programId) {
    return res.status(400).json({ error: 'Program is required' });
  }

  const db = getDb();

  // Verify program exists and is active
  db.get('SELECT * FROM cashbox_programs WHERE id = ? AND active = 1', [programId], (err, program) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!program) {
      return res.status(400).json({ error: 'Invalid or inactive program' });
    }

    db.run(
      'INSERT INTO concession_sessions (name, program_id, created_by, is_test) VALUES (?, ?, ?, ?)',
      [name.trim(), programId, createdBy || null, isTest ? 1 : 0],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, id: this.lastID, status: 'created', isTest: isTest });
      }
    );
  });
});

// POST /api/cashbox/sessions/:id/start - Fill starting cash (Student)
router.post('/sessions/:id/start', (req, res) => {
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

  // Validate non-negative
  if (quarters < 0 || bills_1 < 0 || bills_5 < 0 || bills_10 < 0 || bills_20 < 0 || bills_50 < 0 || bills_100 < 0) {
    return res.status(400).json({ error: 'Denomination counts cannot be negative' });
  }

  const db = getDb();

  // Get the session
  db.get('SELECT * FROM concession_sessions WHERE id = ?', [id], (err, session) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.status !== 'created') {
      return res.status(400).json({ error: 'Session has already been started or closed' });
    }

    const startTotal = calculateTotal({ quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100 });

    // For test sessions, skip cashbox deduction
    if (session.is_test) {
      db.run(
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
        [quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100, startTotal, startedBy || null, id],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ success: true, status: 'active', startTotal, isTest: true });
        }
      );
      return;
    }

    // For real sessions, deduct from main cashbox
    db.get('SELECT * FROM cashbox WHERE id = 1', [], (err, cashbox) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

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

      // Subtract from main cashbox
      db.run(
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
        [quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          // Update session with starting cash
          db.run(
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
            [quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100, startTotal, startedBy || null, id],
            (err) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }
              res.json({ success: true, status: 'active', startTotal });
            }
          );
        }
      );
    });
  });
});

// POST /api/cashbox/sessions/:id/close - Close session with ending cash
router.post('/sessions/:id/close', (req, res) => {
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

  // Validate non-negative
  if (quarters < 0 || bills_1 < 0 || bills_5 < 0 || bills_10 < 0 || bills_20 < 0 || bills_50 < 0 || bills_100 < 0) {
    return res.status(400).json({ error: 'Denomination counts cannot be negative' });
  }

  const db = getDb();

  // Get the session
  db.get('SELECT * FROM concession_sessions WHERE id = ?', [id], (err, session) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    const endTotal = calculateTotal({ quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100 });
    const profit = endTotal - session.start_total;

    // Add ending cash back to main cashbox
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
      [quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Update session with ending cash
        db.run(
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
          [quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100, endTotal, profit, closedBy || null, id],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            // Record profit to program earnings
            db.run(
              'INSERT INTO program_earnings (program_id, session_id, amount) VALUES (?, ?, ?)',
              [session.program_id, id, profit],
              (err) => {
                if (err) {
                  return res.status(500).json({ error: 'Database error' });
                }
                res.json({ success: true, status: 'closed', endTotal, profit });
              }
            );
          }
        );
      }
    );
  });
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

// ==================== PROFIT DISTRIBUTION ====================

// GET /api/cashbox/sessions/:id/distributions - Get profit distributions for a session
router.get('/sessions/:id/distributions', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  db.all(
    `SELECT pd.*, p.name as program_name
     FROM profit_distributions pd
     JOIN cashbox_programs p ON pd.program_id = p.id
     WHERE pd.session_id = ?
     ORDER BY pd.created_at DESC`,
    [id],
    (err, distributions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(distributions);
    }
  );
});

// POST /api/cashbox/sessions/:id/distribute - Distribute profit to programs
router.post('/sessions/:id/distribute', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { distributions, distributedBy } = req.body;

  if (!distributions || !Array.isArray(distributions) || distributions.length === 0) {
    return res.status(400).json({ error: 'Distributions are required' });
  }

  // Verify session is closed
  db.get('SELECT * FROM concession_sessions WHERE id = ?', [id], (err, session) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.status !== 'closed') {
      return res.status(400).json({ error: 'Session must be closed before distributing profit' });
    }

    // Check if already distributed
    db.get('SELECT COUNT(*) as count FROM profit_distributions WHERE session_id = ?', [id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (result.count > 0) {
        return res.status(400).json({ error: 'Profit has already been distributed for this session' });
      }

      // Insert distributions
      let inserted = 0;
      const results = [];

      distributions.forEach(dist => {
        if (dist.amount > 0) {
          db.run(
            `INSERT INTO profit_distributions (session_id, program_id, amount, distributed_by)
             VALUES (?, ?, ?, ?)`,
            [id, dist.programId, dist.amount, distributedBy || ''],
            function(insertErr) {
              inserted++;
              if (!insertErr) {
                results.push({ id: this.lastID, programId: dist.programId, amount: dist.amount });

                // Update program earnings
                db.run(
                  'UPDATE cashbox_programs SET total_earnings = total_earnings + ? WHERE id = ?',
                  [dist.amount, dist.programId]
                );
              }

              if (inserted === distributions.length) {
                res.json({ success: true, distributions: results });
              }
            }
          );
        } else {
          inserted++;
          if (inserted === distributions.length) {
            res.json({ success: true, distributions: results });
          }
        }
      });
    });
  });
});

// DELETE /api/cashbox/sessions/:id/distributions - Remove distributions (admin only)
router.delete('/sessions/:id/distributions', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  // Get existing distributions to reverse earnings
  db.all('SELECT * FROM profit_distributions WHERE session_id = ?', [id], (err, distributions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Reverse program earnings
    distributions.forEach(dist => {
      db.run(
        'UPDATE cashbox_programs SET total_earnings = total_earnings - ? WHERE id = ?',
        [dist.amount, dist.program_id]
      );
    });

    // Delete distributions
    db.run('DELETE FROM profit_distributions WHERE session_id = ?', [id], function(deleteErr) {
      if (deleteErr) {
        return res.status(500).json({ error: deleteErr.message });
      }
      res.json({ success: true, deleted: this.changes });
    });
  });
});

// ==================== PROGRAM CHARGES ====================

// GET /api/cashbox/program-charges - Get all program charges
router.get('/program-charges', (req, res) => {
  const db = getDb();
  const { programId, limit = 100 } = req.query;

  let query = `
    SELECT pc.*, p.name as program_name, s.name as session_name
    FROM program_charges pc
    LEFT JOIN cashbox_programs p ON pc.from_program_id = p.id
    LEFT JOIN concession_sessions s ON pc.session_id = s.id
  `;
  const params = [];

  if (programId) {
    query += ' WHERE pc.from_program_id = ?';
    params.push(programId);
  }

  query += ' ORDER BY pc.created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(query, params, (err, charges) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(charges);
  });
});

// GET /api/cashbox/program-charges/summary - Get summary by program
router.get('/program-charges/summary', (req, res) => {
  const db = getDb();

  db.all(`
    SELECT
      p.id as program_id,
      p.name as program_name,
      COUNT(pc.id) as charge_count,
      COALESCE(SUM(pc.amount), 0) as total_charged,
      COALESCE(SUM(CASE WHEN pc.charge_type = 'comp' THEN pc.amount ELSE 0 END), 0) as total_comps,
      COALESCE(SUM(CASE WHEN pc.charge_type = 'discount' THEN pc.amount ELSE 0 END), 0) as total_discounts
    FROM cashbox_programs p
    LEFT JOIN program_charges pc ON p.id = pc.from_program_id
    GROUP BY p.id
    ORDER BY total_charged DESC
  `, [], (err, summary) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(summary);
  });
});

// ==================== REIMBURSEMENT ====================

// GET /api/cashbox/reimbursement - Get reimbursement summary
router.get('/reimbursement', (req, res) => {
  const db = getDb();

  // Get totals from different sources
  db.get(`
    SELECT
      (SELECT COALESCE(SUM(cogs_reimbursable), 0) FROM orders o JOIN concession_sessions s ON o.session_id = s.id WHERE s.is_test = 0) as total_cogs_owed,
      (SELECT COALESCE(SUM(amount), 0) FROM reimbursement_ledger WHERE entry_type = 'zelle_received') as zelle_received,
      (SELECT COALESCE(SUM(amount), 0) FROM reimbursement_ledger WHERE entry_type = 'cashapp_withdrawal') as cashapp_withdrawn,
      (SELECT COALESCE(SUM(amount), 0) FROM reimbursement_ledger WHERE entry_type = 'cashbox_reimbursement') as cashbox_reimbursed,
      (SELECT COALESCE(SUM(amount), 0) FROM losses WHERE loss_type IN ('cash_discrepancy', 'inventory_discrepancy')) as asb_losses
  `, [], (err, totals) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const grossOwed = (totals.total_cogs_owed || 0) - (totals.asb_losses || 0);
    const totalReceived = (totals.zelle_received || 0) + (totals.cashapp_withdrawn || 0) + (totals.cashbox_reimbursed || 0);
    const remaining = grossOwed - totalReceived;

    res.json({
      totalCogsOwed: totals.total_cogs_owed || 0,
      asbLosses: totals.asb_losses || 0,
      grossOwed,
      zelleReceived: totals.zelle_received || 0,
      cashappWithdrawn: totals.cashapp_withdrawn || 0,
      cashboxReimbursed: totals.cashbox_reimbursed || 0,
      totalReceived,
      remaining
    });
  });
});

// GET /api/cashbox/reimbursement/ledger - Get reimbursement ledger entries
router.get('/reimbursement/ledger', (req, res) => {
  const db = getDb();
  const { limit = 100 } = req.query;

  db.all(`
    SELECT rl.*, s.name as session_name
    FROM reimbursement_ledger rl
    LEFT JOIN concession_sessions s ON rl.session_id = s.id
    ORDER BY rl.created_at DESC
    LIMIT ?
  `, [parseInt(limit)], (err, entries) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(entries);
  });
});

// POST /api/cashbox/reimbursement/record - Record a reimbursement
router.post('/reimbursement/record', (req, res) => {
  const db = getDb();
  const { entryType, amount, sessionId, referenceId, notes } = req.body;

  const validTypes = ['cogs_owed', 'asb_loss', 'zelle_received', 'cashapp_withdrawal', 'cashbox_reimbursement'];
  if (!validTypes.includes(entryType)) {
    return res.status(400).json({ error: 'Invalid entry type' });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be positive' });
  }

  db.run(
    `INSERT INTO reimbursement_ledger (entry_type, amount, session_id, reference_id, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [entryType, amount, sessionId || null, referenceId || null, notes || ''],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

module.exports = router;
