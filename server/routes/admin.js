const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/leadership-hub.db');
const DATA_DIR = path.dirname(DB_PATH);

// POST /api/admin/archive-year - Archive current data and reset for new year
router.post('/archive-year', (req, res) => {
  const { confirmPhrase } = req.body;

  if (confirmPhrase !== 'ARCHIVE AND RESET') {
    return res.status(400).json({ error: 'Confirmation phrase required. Send { confirmPhrase: "ARCHIVE AND RESET" }' });
  }

  const db = getDb();
  const timestamp = new Date().toISOString().split('T')[0];
  const backupFilename = `leadership-backup-${timestamp}.db`;
  const backupPath = path.join(DATA_DIR, backupFilename);

  // Check if backup already exists for today
  if (fs.existsSync(backupPath)) {
    return res.status(409).json({ error: `Backup already exists for today: ${backupFilename}. Try again tomorrow or delete the existing backup.` });
  }

  // Step 1: Create backup copy of the database
  try {
    fs.copyFileSync(DB_PATH, backupPath);
  } catch (err) {
    return res.status(500).json({ error: `Failed to create backup: ${err.message}` });
  }

  // Step 2: Clear transactional tables and reset inventory
  const clearStatements = [
    // Order data
    'DELETE FROM order_items',
    'DELETE FROM orders',
    // Session data
    'DELETE FROM session_bulk_inventory',
    'DELETE FROM concession_sessions',
    // Payment tracking
    'DELETE FROM cashapp_payments',
    'DELETE FROM zelle_payments',
    // Financial records
    'DELETE FROM reimbursement_ledger',
    'DELETE FROM losses',
    'DELETE FROM profit_distributions',
    'DELETE FROM program_earnings',
    // Purchase history
    'DELETE FROM purchase_items',
    'DELETE FROM purchases',
    // Inventory tracking
    'DELETE FROM inventory_lots',
    'DELETE FROM inventory_transactions',
    'DELETE FROM inventory_counts',
    'DELETE FROM inventory_verifications',
    // Hours tracking
    'DELETE FROM hours',
    // Reset menu item inventory quantities
    'UPDATE menu_items SET quantity_on_hand = 0, last_inventory_check = NULL, last_checked_by = NULL',
    // Reset program balances
    'UPDATE cashbox_programs SET balance = 0',
  ];

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    let failed = false;
    for (const sql of clearStatements) {
      db.run(sql, (err) => {
        if (err && !err.message.includes('no such table')) {
          console.error(`Archive cleanup failed on: ${sql}`, err.message);
          failed = true;
        }
      });
    }

    db.run('COMMIT', (err) => {
      if (err || failed) {
        // Attempt rollback
        db.run('ROLLBACK');
        return res.status(500).json({
          error: 'Some cleanup operations failed. Backup was still created.',
          backupFile: backupFilename
        });
      }

      res.json({
        success: true,
        message: 'Year archived successfully. All transactional data cleared.',
        backupFile: backupFilename,
        tablesCleared: [
          'orders', 'order_items', 'concession_sessions', 'session_bulk_inventory',
          'cashapp_payments', 'zelle_payments', 'reimbursement_ledger', 'losses',
          'profit_distributions', 'program_earnings', 'purchases', 'purchase_items',
          'inventory_lots', 'inventory_transactions', 'inventory_counts',
          'inventory_verifications', 'hours'
        ],
        resets: ['menu_items.quantity_on_hand → 0', 'cashbox_programs.balance → 0']
      });
    });
  });
});

// GET /api/admin/backups - List available backup files
router.get('/backups', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR)
      .filter(f => f.startsWith('leadership-backup-') && f.endsWith('.db'))
      .map(f => {
        const stats = fs.statSync(path.join(DATA_DIR, f));
        return {
          filename: f,
          size: stats.size,
          sizeFormatted: `${(stats.size / (1024 * 1024)).toFixed(1)} MB`,
          created: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json(files);
  } catch (err) {
    res.json([]);
  }
});

// GET /api/admin/backups/:filename - Download a backup file
router.get('/backups/:filename', (req, res) => {
  const { filename } = req.params;

  // Sanitize filename to prevent path traversal
  if (!filename.startsWith('leadership-backup-') || !filename.endsWith('.db') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid backup filename' });
  }

  const filePath = path.join(DATA_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Backup not found' });
  }

  res.download(filePath, filename);
});

module.exports = router;
