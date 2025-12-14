const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// Get CashApp balance
router.get('/balance', (req, res) => {
  const db = getDb();

  db.get('SELECT * FROM cashapp_account WHERE id = 1', [], (err, account) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      balance: account?.balance || 0,
      updatedAt: account?.updated_at
    });
  });
});

// Get CashApp transactions
router.get('/transactions', (req, res) => {
  const db = getDb();
  const { limit = 50 } = req.query;

  db.all(
    `SELECT ct.*, cs.name as session_name
     FROM cashapp_transactions ct
     LEFT JOIN concession_sessions cs ON ct.session_id = cs.id
     ORDER BY ct.created_at DESC
     LIMIT ?`,
    [parseInt(limit)],
    (err, transactions) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(transactions);
    }
  );
});

// Record withdrawal from CashApp
router.post('/withdraw', (req, res) => {
  const db = getDb();
  const { amount, notes, withdrawnBy } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  // Check current balance
  db.get('SELECT balance FROM cashapp_account WHERE id = 1', [], (err, account) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const currentBalance = account?.balance || 0;
    if (amount > currentBalance) {
      return res.status(400).json({ error: `Insufficient balance. Current: ${currentBalance}` });
    }

    const newBalance = currentBalance - amount;

    // Update balance
    db.run(
      'UPDATE cashapp_account SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [newBalance],
      function(updateErr) {
        if (updateErr) {
          return res.status(500).json({ error: updateErr.message });
        }

        // Record transaction
        db.run(
          `INSERT INTO cashapp_transactions (transaction_type, amount, notes) VALUES ('withdrawal', ?, ?)`,
          [-amount, notes || `Withdrawal by ${withdrawnBy || 'admin'}`],
          function(txErr) {
            if (txErr) {
              return res.status(500).json({ error: txErr.message });
            }

            // Add to reimbursement ledger
            db.run(
              `INSERT INTO reimbursement_ledger (entry_type, amount, notes) VALUES ('cashapp_withdrawal', ?, ?)`,
              [amount, notes || `CashApp withdrawal`]
            );

            res.json({
              success: true,
              withdrawalAmount: amount,
              newBalance,
              transactionId: this.lastID
            });
          }
        );
      }
    );
  });
});

// Get Zelle payments summary
router.get('/zelle', (req, res) => {
  const db = getDb();
  const { sessionId, limit = 50 } = req.query;

  let query = `
    SELECT zp.*, o.subtotal, cs.name as session_name
    FROM zelle_payments zp
    LEFT JOIN orders o ON zp.order_id = o.id
    LEFT JOIN concession_sessions cs ON zp.session_id = cs.id
  `;
  const params = [];

  if (sessionId) {
    query += ' WHERE zp.session_id = ?';
    params.push(sessionId);
  }

  query += ' ORDER BY zp.created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(query, params, (err, payments) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Calculate total
    const total = payments.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      payments,
      total
    });
  });
});

module.exports = router;
