const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/leadership-hub.db');
const DATA_DIR = path.dirname(DB_PATH);

// POST /api/admin/archive-year - Archive data before a cutoff date and reset
router.post('/archive-year', (req, res) => {
  const { confirmPhrase, cutoffDate } = req.body;

  if (confirmPhrase !== 'ARCHIVE AND RESET') {
    return res.status(400).json({ error: 'Confirmation phrase required. Send { confirmPhrase: "ARCHIVE AND RESET" }' });
  }

  if (!cutoffDate || !/^\d{4}-\d{2}-\d{2}$/.test(cutoffDate)) {
    return res.status(400).json({ error: 'Valid cutoff date required (YYYY-MM-DD). Only data before this date will be archived.' });
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

  // Step 2: Clear transactional data BEFORE the cutoff date
  // Use cutoffDate + ' 00:00:00' so the entire cutoff day is excluded from deletion
  const cutoff = cutoffDate;
  const clearStatements = [
    // Order items for orders before cutoff, plus orders in stale pending/active sessions
    `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE created_at < '${cutoff}' OR session_id IN (SELECT id FROM concession_sessions WHERE status IN ('created', 'active') AND created_at < '${cutoff}'))`,
    // Orders before cutoff, plus orders in stale pending/active sessions
    `DELETE FROM orders WHERE created_at < '${cutoff}' OR session_id IN (SELECT id FROM concession_sessions WHERE status IN ('created', 'active') AND created_at < '${cutoff}')`,
    // Session bulk inventory for sessions before cutoff
    `DELETE FROM session_bulk_inventory WHERE session_id IN (SELECT id FROM concession_sessions WHERE created_at < '${cutoff}')`,
    // Sessions before cutoff — includes any still-pending (created/active) sessions
    `DELETE FROM concession_sessions WHERE created_at < '${cutoff}'`,
    // Payment tracking before cutoff
    `DELETE FROM cashapp_payments WHERE created_at < '${cutoff}'`,
    `DELETE FROM zelle_payments WHERE created_at < '${cutoff}'`,
    // Financial records before cutoff
    `DELETE FROM reimbursement_ledger WHERE created_at < '${cutoff}'`,
    `DELETE FROM losses WHERE created_at < '${cutoff}'`,
    `DELETE FROM profit_distributions WHERE created_at < '${cutoff}'`,
    `DELETE FROM program_earnings WHERE created_at < '${cutoff}'`,
    // Purchase items for purchases before cutoff
    `DELETE FROM purchase_items WHERE purchase_id IN (SELECT id FROM purchases WHERE purchase_date < '${cutoff}')`,
    // Purchases before cutoff
    `DELETE FROM purchases WHERE purchase_date < '${cutoff}'`,
    // Inventory tracking before cutoff
    `DELETE FROM inventory_lots WHERE created_at < '${cutoff}'`,
    `DELETE FROM inventory_transactions WHERE created_at < '${cutoff}'`,
    `DELETE FROM inventory_counts WHERE created_at < '${cutoff}'`,
    `DELETE FROM inventory_verifications WHERE created_at < '${cutoff}'`,
    // Hours before cutoff
    `DELETE FROM hours WHERE created_at < '${cutoff}'`,
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
        db.run('ROLLBACK');
        return res.status(500).json({
          error: 'Some cleanup operations failed. Backup was still created.',
          backupFile: backupFilename
        });
      }

      res.json({
        success: true,
        message: `Data before ${cutoffDate} archived and cleared successfully.`,
        backupFile: backupFilename,
        cutoffDate: cutoffDate,
        tablesCleared: [
          'orders', 'order_items', 'concession_sessions', 'session_bulk_inventory',
          'cashapp_payments', 'zelle_payments', 'reimbursement_ledger', 'losses',
          'profit_distributions', 'program_earnings', 'purchases', 'purchase_items',
          'inventory_lots', 'inventory_transactions', 'inventory_counts',
          'inventory_verifications', 'hours'
        ]
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
