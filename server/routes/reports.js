const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// Helper to convert data to CSV
function toCSV(data, columns) {
  if (!data || data.length === 0) return '';

  const headers = columns.map(c => c.label).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      let val = row[c.key];
      if (val === null || val === undefined) val = '';
      // Escape quotes and wrap in quotes if contains comma or quote
      val = String(val);
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    }).join(',')
  );

  return headers + '\n' + rows.join('\n');
}

// GET /api/reports/sessions - Export sessions data
router.get('/sessions', (req, res) => {
  const { startDate, endDate, format = 'json' } = req.query;
  const db = getDb();

  let query = `
    SELECT
      cs.id,
      cs.name,
      cp.name as program_name,
      cs.status,
      cs.start_time,
      cs.end_time,
      cs.start_total,
      cs.end_total,
      cs.profit,
      cs.started_by,
      cs.closed_by,
      cs.created_at
    FROM concession_sessions cs
    LEFT JOIN cashbox_programs cp ON cs.program_id = cp.id
    WHERE cs.status = 'closed'
  `;
  const params = [];

  if (startDate) {
    query += ' AND DATE(cs.start_time) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND DATE(cs.start_time) <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY cs.start_time DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (format === 'csv') {
      const csv = toCSV(rows, [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Session Name' },
        { key: 'program_name', label: 'Program' },
        { key: 'status', label: 'Status' },
        { key: 'start_time', label: 'Start Time' },
        { key: 'end_time', label: 'End Time' },
        { key: 'start_total', label: 'Starting Cash' },
        { key: 'end_total', label: 'Ending Cash' },
        { key: 'profit', label: 'Profit' },
        { key: 'started_by', label: 'Started By' },
        { key: 'closed_by', label: 'Closed By' }
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=sessions.csv');
      return res.send(csv);
    }

    res.json(rows);
  });
});

// GET /api/reports/inventory - Export inventory data
router.get('/inventory', (req, res) => {
  const { format = 'json' } = req.query;
  const db = getDb();

  db.all(
    `SELECT
      mi.id,
      mi.name,
      mi.price,
      mi.quantity_on_hand,
      mi.unit_cost,
      mi.track_inventory,
      mi.active,
      (SELECT SUM(quantity_remaining) FROM inventory_lots WHERE menu_item_id = mi.id) as lot_quantity,
      (SELECT COUNT(*) FROM inventory_lots WHERE menu_item_id = mi.id AND quantity_remaining > 0) as active_lots
    FROM menu_items mi
    WHERE mi.price IS NOT NULL
    ORDER BY mi.name`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (format === 'csv') {
        const csv = toCSV(rows, [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Item Name' },
          { key: 'price', label: 'Sale Price' },
          { key: 'unit_cost', label: 'Unit Cost' },
          { key: 'quantity_on_hand', label: 'Quantity On Hand' },
          { key: 'lot_quantity', label: 'Lot Quantity' },
          { key: 'active_lots', label: 'Active Lots' },
          { key: 'track_inventory', label: 'Track Inventory' },
          { key: 'active', label: 'Active' }
        ]);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=inventory.csv');
        return res.send(csv);
      }

      res.json(rows);
    }
  );
});

// GET /api/reports/purchases - Export purchases data
router.get('/purchases', (req, res) => {
  const { startDate, endDate, format = 'json' } = req.query;
  const db = getDb();

  let query = `
    SELECT
      p.id,
      p.vendor,
      p.purchase_date,
      p.subtotal,
      p.tax,
      p.delivery_fee,
      p.other_fees,
      p.total,
      p.notes,
      p.created_by,
      p.created_at
    FROM purchases p
    WHERE 1=1
  `;
  const params = [];

  if (startDate) {
    query += ' AND p.purchase_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND p.purchase_date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY p.purchase_date DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (format === 'csv') {
      const csv = toCSV(rows, [
        { key: 'id', label: 'ID' },
        { key: 'vendor', label: 'Vendor' },
        { key: 'purchase_date', label: 'Date' },
        { key: 'subtotal', label: 'Subtotal' },
        { key: 'tax', label: 'Tax' },
        { key: 'delivery_fee', label: 'Delivery Fee' },
        { key: 'other_fees', label: 'Other Fees' },
        { key: 'total', label: 'Total' },
        { key: 'notes', label: 'Notes' },
        { key: 'created_by', label: 'Created By' }
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=purchases.csv');
      return res.send(csv);
    }

    res.json(rows);
  });
});

// GET /api/reports/losses - Export losses data
router.get('/losses', (req, res) => {
  const { startDate, endDate, format = 'json' } = req.query;
  const db = getDb();

  let query = `
    SELECT
      l.id,
      l.loss_type,
      l.amount,
      l.description,
      l.recorded_by,
      l.created_at,
      cs.name as session_name,
      cp.name as program_name
    FROM losses l
    LEFT JOIN concession_sessions cs ON l.session_id = cs.id
    LEFT JOIN cashbox_programs cp ON l.program_id = cp.id
    WHERE 1=1
  `;
  const params = [];

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
      return res.status(500).json({ error: 'Database error' });
    }

    if (format === 'csv') {
      const csv = toCSV(rows, [
        { key: 'id', label: 'ID' },
        { key: 'loss_type', label: 'Type' },
        { key: 'amount', label: 'Amount' },
        { key: 'description', label: 'Description' },
        { key: 'session_name', label: 'Session' },
        { key: 'program_name', label: 'Program' },
        { key: 'recorded_by', label: 'Recorded By' },
        { key: 'created_at', label: 'Date' }
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=losses.csv');
      return res.send(csv);
    }

    res.json(rows);
  });
});

// GET /api/reports/orders - Export orders data
router.get('/orders', (req, res) => {
  const { sessionId, startDate, endDate, format = 'json' } = req.query;
  const db = getDb();

  let query = `
    SELECT
      o.id,
      o.session_id,
      cs.name as session_name,
      o.subtotal,
      o.discount_amount,
      o.final_total,
      o.payment_method,
      o.is_comp,
      o.amount_tendered,
      o.change_given,
      o.cogs_total,
      o.cogs_reimbursable,
      o.created_at,
      GROUP_CONCAT(oi.quantity || 'x ' || mi.name) as items
    FROM orders o
    LEFT JOIN concession_sessions cs ON o.session_id = cs.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
    WHERE 1=1
  `;
  const params = [];

  if (sessionId) {
    query += ' AND o.session_id = ?';
    params.push(sessionId);
  }
  if (startDate) {
    query += ' AND DATE(o.created_at) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND DATE(o.created_at) <= ?';
    params.push(endDate);
  }

  query += ' GROUP BY o.id ORDER BY o.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (format === 'csv') {
      const csv = toCSV(rows, [
        { key: 'id', label: 'Order ID' },
        { key: 'session_name', label: 'Session' },
        { key: 'items', label: 'Items' },
        { key: 'subtotal', label: 'Subtotal' },
        { key: 'discount_amount', label: 'Discount' },
        { key: 'final_total', label: 'Final Total' },
        { key: 'payment_method', label: 'Payment Method' },
        { key: 'is_comp', label: 'Is Comp' },
        { key: 'cogs_total', label: 'COGS' },
        { key: 'cogs_reimbursable', label: 'COGS Reimbursable' },
        { key: 'created_at', label: 'Date' }
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
      return res.send(csv);
    }

    res.json(rows);
  });
});

// GET /api/reports/programs - Program P&L report
router.get('/programs', (req, res) => {
  const { startDate, endDate, format = 'json' } = req.query;
  const db = getDb();

  let dateFilter = '';
  const params = [];

  if (startDate) {
    dateFilter += ' AND DATE(cs.start_time) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND DATE(cs.start_time) <= ?';
    params.push(endDate);
  }

  db.all(
    `SELECT
      cp.id,
      cp.name,
      cp.balance,
      COALESCE(SUM(CASE WHEN cs.status = 'closed' THEN cs.profit ELSE 0 END), 0) as total_profit,
      COUNT(CASE WHEN cs.status = 'closed' THEN 1 END) as session_count,
      COALESCE((SELECT SUM(amount) FROM profit_distributions pd
                JOIN concession_sessions cs2 ON pd.session_id = cs2.id
                WHERE pd.program_id = cp.id ${dateFilter.replace(/cs\./g, 'cs2.')}), 0) as total_distributed
    FROM cashbox_programs cp
    LEFT JOIN concession_sessions cs ON cp.id = cs.program_id ${dateFilter}
    GROUP BY cp.id
    ORDER BY cp.name`,
    [...params, ...params],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }

      if (format === 'csv') {
        const csv = toCSV(rows, [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Program Name' },
          { key: 'balance', label: 'Current Balance' },
          { key: 'session_count', label: 'Sessions' },
          { key: 'total_profit', label: 'Total Profit' },
          { key: 'total_distributed', label: 'Amount Distributed' }
        ]);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=programs.csv');
        return res.send(csv);
      }

      res.json(rows);
    }
  );
});

// GET /api/reports/reimbursement - Reimbursement history
router.get('/reimbursement', (req, res) => {
  const { format = 'json' } = req.query;
  const db = getDb();

  db.all(
    `SELECT
      rl.id,
      rl.entry_type,
      rl.amount,
      rl.session_id,
      cs.name as session_name,
      rl.notes,
      rl.created_at
    FROM reimbursement_ledger rl
    LEFT JOIN concession_sessions cs ON rl.session_id = cs.id
    ORDER BY rl.created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Calculate summary
      const summary = {
        cogs_owed: 0,
        asb_loss: 0,
        zelle_received: 0,
        cashapp_withdrawal: 0,
        cashbox_reimbursement: 0
      };

      rows.forEach(row => {
        if (summary[row.entry_type] !== undefined) {
          summary[row.entry_type] += row.amount;
        }
      });

      const grossOwed = summary.cogs_owed - summary.asb_loss;
      const received = summary.zelle_received + summary.cashapp_withdrawal + summary.cashbox_reimbursement;
      const remaining = grossOwed - received;

      if (format === 'csv') {
        const csv = toCSV(rows, [
          { key: 'id', label: 'ID' },
          { key: 'entry_type', label: 'Type' },
          { key: 'amount', label: 'Amount' },
          { key: 'session_name', label: 'Session' },
          { key: 'notes', label: 'Notes' },
          { key: 'created_at', label: 'Date' }
        ]);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=reimbursement.csv');
        return res.send(csv);
      }

      res.json({
        entries: rows,
        summary: {
          ...summary,
          grossOwed,
          received,
          remaining
        }
      });
    }
  );
});

// GET /api/reports/summary - Overall summary dashboard
router.get('/summary', (req, res) => {
  const { startDate, endDate } = req.query;
  const db = getDb();

  let dateFilter = '';
  const params = [];

  if (startDate) {
    dateFilter = ' AND DATE(created_at) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND DATE(created_at) <= ?';
    params.push(endDate);
  }

  const results = {};

  // Get session stats
  db.get(
    `SELECT
      COUNT(*) as total_sessions,
      COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_sessions,
      COALESCE(SUM(CASE WHEN status = 'closed' THEN profit ELSE 0 END), 0) as total_profit
    FROM concession_sessions
    WHERE 1=1 ${dateFilter.replace('created_at', 'start_time')}`,
    params,
    (err, sessionStats) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      results.sessions = sessionStats;

      // Get order stats
      db.get(
        `SELECT
          COUNT(*) as total_orders,
          COALESCE(SUM(final_total), 0) as total_revenue,
          COALESCE(SUM(cogs_total), 0) as total_cogs,
          COALESCE(SUM(discount_amount), 0) as total_discounts,
          COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN final_total ELSE 0 END), 0) as cash_revenue,
          COALESCE(SUM(CASE WHEN payment_method = 'cashapp' THEN final_total ELSE 0 END), 0) as cashapp_revenue,
          COALESCE(SUM(CASE WHEN payment_method = 'zelle' THEN final_total ELSE 0 END), 0) as zelle_revenue
        FROM orders
        WHERE 1=1 ${dateFilter}`,
        params,
        (err, orderStats) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          results.orders = orderStats;

          // Get loss stats
          db.get(
            `SELECT
              COUNT(*) as total_losses,
              COALESCE(SUM(amount), 0) as total_loss_amount
            FROM losses
            WHERE 1=1 ${dateFilter}`,
            params,
            (err, lossStats) => {
              if (err) return res.status(500).json({ error: 'Database error' });
              results.losses = lossStats;

              // Get purchase stats
              db.get(
                `SELECT
                  COUNT(*) as total_purchases,
                  COALESCE(SUM(total), 0) as total_purchase_amount
                FROM purchases
                WHERE 1=1 ${dateFilter.replace('created_at', 'purchase_date')}`,
                params,
                (err, purchaseStats) => {
                  if (err) return res.status(500).json({ error: 'Database error' });
                  results.purchases = purchaseStats;

                  res.json(results);
                }
              );
            }
          );
        }
      );
    }
  );
});

module.exports = router;
