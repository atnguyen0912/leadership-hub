const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// GET /api/losses - Get all losses with optional filtering
router.get('/', (req, res) => {
  const { sessionId, programId, lossType, startDate, endDate } = req.query;
  const db = getDb();

  let query = `
    SELECT l.*,
           cs.start_time as session_start,
           cp.name as program_name
    FROM losses l
    LEFT JOIN concession_sessions cs ON l.session_id = cs.id
    LEFT JOIN cashbox_programs cp ON l.program_id = cp.id
    WHERE 1=1
  `;
  const params = [];

  if (sessionId) {
    query += ' AND l.session_id = ?';
    params.push(sessionId);
  }
  if (programId) {
    query += ' AND l.program_id = ?';
    params.push(programId);
  }
  if (lossType) {
    query += ' AND l.loss_type = ?';
    params.push(lossType);
  }
  if (startDate) {
    query += ' AND DATE(l.created_at) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND DATE(l.created_at) <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY l.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    res.json(rows);
  });
});

// GET /api/losses/summary - Get loss summary by type and period
router.get('/summary', (req, res) => {
  const { startDate, endDate } = req.query;
  const db = getDb();

  let dateFilter = '';
  const params = [];

  if (startDate) {
    dateFilter += ' AND DATE(created_at) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND DATE(created_at) <= ?';
    params.push(endDate);
  }

  db.all(
    `SELECT
       loss_type,
       COUNT(*) as count,
       SUM(amount) as total_amount
     FROM losses
     WHERE 1=1 ${dateFilter}
     GROUP BY loss_type`,
    params,
    (err, byType) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      db.get(
        `SELECT
           COUNT(*) as total_count,
           COALESCE(SUM(amount), 0) as total_amount
         FROM losses
         WHERE 1=1 ${dateFilter}`,
        params,
        (err, totals) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          res.json({
            byType,
            totals
          });
        }
      );
    }
  );
});

// POST /api/losses - Record a new loss
router.post('/', (req, res) => {
  const { sessionId, programId, lossType, amount, description, recordedBy } = req.body;
  const db = getDb();

  if (!lossType || amount === undefined) {
    return res.status(400).json({ error: 'Loss type and amount are required' });
  }

  const validTypes = ['cash_discrepancy', 'inventory_discrepancy', 'spoilage', 'other'];
  if (!validTypes.includes(lossType)) {
    return res.status(400).json({ error: 'Invalid loss type' });
  }

  db.run(
    `INSERT INTO losses (session_id, program_id, loss_type, amount, description, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [sessionId || null, programId || null, lossType, amount, description || '', recordedBy || ''],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }

      // If this is an ASB loss (no program_id or programId is ASB), add to reimbursement ledger
      if (!programId) {
        db.run(
          `INSERT INTO reimbursement_ledger (entry_type, amount, session_id, reference_id, notes)
           VALUES ('asb_loss', ?, ?, ?, ?)`,
          [amount, sessionId || null, this.lastID, `${lossType}: ${description || ''}`]
        );
      }

      res.json({
        success: true,
        id: this.lastID,
        message: 'Loss recorded successfully'
      });
    }
  );
});

// DELETE /api/losses/:id - Delete a loss record
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  // First remove from reimbursement ledger if exists
  db.run(
    `DELETE FROM reimbursement_ledger WHERE entry_type = 'asb_loss' AND reference_id = ?`,
    [id],
    (err) => {
      if (err) console.error('Error removing reimbursement ledger entry:', err);

      db.run('DELETE FROM losses WHERE id = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Loss record not found' });
        }
        res.json({ success: true });
      });
    }
  );
});

// GET /api/losses/session/:sessionId - Get losses for a specific session
router.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const db = getDb();

  db.all(
    `SELECT * FROM losses WHERE session_id = ? ORDER BY created_at DESC`,
    [sessionId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

module.exports = router;
