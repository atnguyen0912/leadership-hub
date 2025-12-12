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
  const { name, programId, createdBy } = req.body;

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
      'INSERT INTO concession_sessions (name, program_id, created_by) VALUES (?, ?, ?)',
      [name.trim(), programId, createdBy || null],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, id: this.lastID, status: 'created' });
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

    // Get current main cashbox
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

      const startTotal = calculateTotal({ quarters, bills_1, bills_5, bills_10, bills_20, bills_50, bills_100 });

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

module.exports = router;
