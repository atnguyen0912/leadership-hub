/**
 * Losses Routes
 *
 * Handles loss tracking and settlement operations
 */

const express = require('express');
const router = express.Router();
const { run, get, all, transaction } = require('../db-utils');
const { requirePermission } = require('../middleware/auth');

// GET /api/losses - Get all losses with optional filters
router.get('/', async (req, res) => {
  try {
    const { settled, sessionId, programId, lossType, startDate, endDate } = req.query;

    let query = `
      SELECT
        l.*,
        cs.name as session_name,
        p.name as program_name
      FROM losses l
      LEFT JOIN concession_sessions cs ON l.session_id = cs.id
      LEFT JOIN cashbox_programs p ON l.program_id = p.id
      WHERE 1=1
    `;

    const params = [];

    // Filter by settled status if provided
    if (settled === 'true') {
      query += ' AND l.settled_to IS NOT NULL';
    } else if (settled === 'false') {
      query += ' AND l.settled_to IS NULL';
    }

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

    const losses = await all(query, params);

    res.json(losses);
  } catch (err) {
    console.error('Failed to fetch losses:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// GET /api/losses/unsettled - Get unsettled losses summary
router.get('/unsettled', async (req, res) => {
  try {
    // Get unsettled losses
    const losses = await all(
      `SELECT
        l.*,
        cs.name as session_name,
        p.name as program_name
      FROM losses l
      LEFT JOIN concession_sessions cs ON l.session_id = cs.id
      LEFT JOIN cashbox_programs p ON l.program_id = p.id
      WHERE l.settled_to IS NULL
      ORDER BY l.created_at DESC`
    );

    // Calculate totals
    const totalAmount = losses.reduce((sum, loss) => sum + (loss.amount || 0), 0);
    const count = losses.length;

    res.json({
      losses,
      count,
      totalAmount
    });
  } catch (err) {
    console.error('Failed to fetch unsettled losses:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// GET /api/losses/summary - Get loss summary by type and period
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

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

    const byType = await all(
      `SELECT
         loss_type,
         COUNT(*) as count,
         SUM(amount) as total_amount
       FROM losses
       WHERE 1=1 ${dateFilter}
       GROUP BY loss_type`,
      params
    );

    const totals = await get(
      `SELECT
         COUNT(*) as total_count,
         COALESCE(SUM(amount), 0) as total_amount
       FROM losses
       WHERE 1=1 ${dateFilter}`,
      params
    );

    res.json({
      byType,
      totals
    });
  } catch (err) {
    console.error('Failed to fetch loss summary:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// POST /api/losses - Create new loss record
router.post('/', async (req, res) => {
  try {
    const { lossType, amount, sessionId, programId, description, createdBy, recordedBy } = req.body;

    // Validate required fields
    if (!lossType || !amount) {
      return res.status(400).json({ error: 'lossType and amount are required' });
    }

    // Validate loss type
    const validLossTypes = [
      'cash_shortage',
      'cash_overage',
      'cash_discrepancy',
      'inventory_discrepancy',
      'spoilage',
      'damaged_goods',
      'theft',
      'other'
    ];
    if (!validLossTypes.includes(lossType)) {
      return res.status(400).json({ error: 'Invalid loss type' });
    }

    const creator = createdBy || recordedBy || null;

    // Insert the loss record
    const result = await run(
      `INSERT INTO losses (
        loss_type,
        amount,
        session_id,
        program_id,
        description,
        created_by,
        recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        lossType,
        amount,
        sessionId || null,
        programId || null,
        description || null,
        creator,
        creator // Also set recorded_by for backward compatibility
      ]
    );

    // Fetch the created loss with joined data
    const loss = await get(
      `SELECT
        l.*,
        cs.name as session_name,
        p.name as program_name
      FROM losses l
      LEFT JOIN concession_sessions cs ON l.session_id = cs.id
      LEFT JOIN cashbox_programs p ON l.program_id = p.id
      WHERE l.id = ?`,
      [result.lastID]
    );

    res.json(loss);
  } catch (err) {
    console.error('Failed to create loss:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// GET /api/losses/:id - Get single loss details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const loss = await get(
      `SELECT
        l.*,
        cs.name as session_name,
        p.name as program_name
      FROM losses l
      LEFT JOIN concession_sessions cs ON l.session_id = cs.id
      LEFT JOIN cashbox_programs p ON l.program_id = p.id
      WHERE l.id = ?`,
      [id]
    );

    if (!loss) {
      return res.status(404).json({ error: 'Loss not found' });
    }

    res.json(loss);
  } catch (err) {
    console.error('Failed to fetch loss:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// POST /api/losses/:id/settle - Settle a loss
router.post('/:id/settle', async (req, res) => {
  try {
    const { id } = req.params;
    const { settleTo, settledBy, notes } = req.body;

    // Validate required fields
    if (!settleTo || !settledBy) {
      return res.status(400).json({ error: 'settleTo and settledBy are required' });
    }

    // 1. Verify loss exists and is unsettled
    const loss = await get('SELECT * FROM losses WHERE id = ?', [id]);

    if (!loss) {
      return res.status(404).json({ error: 'Loss not found' });
    }

    if (loss.settled_to) {
      return res.status(400).json({ error: 'Loss has already been settled' });
    }

    // Use transaction to ensure atomicity
    await transaction(async ({ run: txRun, get: txGet }) => {
      // 2. Handle settlement based on type
      if (settleTo === 'asb') {
        // ASB absorbs the loss - no balance changes needed
        // Just update the loss record (done below)
      } else if (settleTo.startsWith('program:')) {
        // 3. Extract program ID and deduct from program balance
        const programId = parseInt(settleTo.split(':')[1]);

        if (isNaN(programId)) {
          throw new Error('Invalid program ID in settleTo');
        }

        // Verify program exists
        const program = await txGet('SELECT * FROM cashbox_programs WHERE id = ?', [programId]);
        if (!program) {
          throw new Error('Program not found');
        }

        // Deduct from program balance
        await txRun(
          'UPDATE cashbox_programs SET balance = balance - ? WHERE id = ?',
          [loss.amount, programId]
        );
      } else if (settleTo === 'reimbursement') {
        // 4. Create reimbursement ledger entry to offset the loss
        await txRun(
          `INSERT INTO reimbursement_ledger (entry_type, amount, notes, reference_id)
           VALUES ('loss_offset', ?, ?, ?)`,
          [
            -loss.amount, // Negative to reduce amount owed
            `Loss settlement: ${loss.description || 'Unspecified loss'}`,
            loss.id
          ]
        );
      } else {
        throw new Error('Invalid settleTo value. Must be "asb", "program:X", or "reimbursement"');
      }

      // 5. Update loss record with settlement info
      await txRun(
        `UPDATE losses SET
         settled_to = ?,
         settled_at = CURRENT_TIMESTAMP,
         settled_by = ?,
         settlement_notes = ?
         WHERE id = ?`,
        [settleTo, settledBy, notes || null, id]
      );
    });

    // 6. Return updated loss record with joined data
    const updatedLoss = await get(
      `SELECT
        l.*,
        cs.name as session_name,
        p.name as program_name
      FROM losses l
      LEFT JOIN concession_sessions cs ON l.session_id = cs.id
      LEFT JOIN cashbox_programs p ON l.program_id = p.id
      WHERE l.id = ?`,
      [id]
    );

    res.json(updatedLoss);
  } catch (err) {
    console.error('Failed to settle loss:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// DELETE /api/losses/:id - Delete a loss record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First check if loss is settled
    const loss = await get('SELECT * FROM losses WHERE id = ?', [id]);
    if (!loss) {
      return res.status(404).json({ error: 'Loss record not found' });
    }

    if (loss.settled_to) {
      return res.status(400).json({ error: 'Cannot delete a settled loss' });
    }

    // Remove from reimbursement ledger if exists
    await run(
      `DELETE FROM reimbursement_ledger WHERE entry_type = 'asb_loss' AND reference_id = ?`,
      [id]
    );

    // Delete the loss
    await run('DELETE FROM losses WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete loss:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
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
