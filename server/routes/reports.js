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
  const { startDate, endDate, sessionId, format = 'json' } = req.query;
  const db = getDb();

  let query = `
    SELECT
      cs.id,
      cs.name,
      cp.name as program_name,
      cs.status,
      cs.started_at,
      cs.closed_at,
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

  if (sessionId) {
    query += ' AND cs.id = ?';
    params.push(sessionId);
  }
  if (startDate) {
    query += ' AND DATE(cs.started_at) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND DATE(cs.started_at) <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY cs.started_at DESC';

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
        { key: 'started_at', label: 'Start Time' },
        { key: 'closed_at', label: 'End Time' },
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
  const { startDate, endDate, programId, format = 'json' } = req.query;
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

  if (programId) {
    query += ' AND l.program_id = ?';
    params.push(programId);
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
  const { startDate, endDate, programId, format = 'json' } = req.query;
  const db = getDb();

  let dateFilter = '';
  let programFilter = '';
  const params = [];

  if (programId) {
    programFilter = ' AND cp.id = ?';
    params.push(programId);
  }
  if (startDate) {
    dateFilter += ' AND DATE(cs.started_at) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND DATE(cs.started_at) <= ?';
    params.push(endDate);
  }

  // Build date params for the subquery (needs its own copy)
  const dateParams = [];
  if (startDate) dateParams.push(startDate);
  if (endDate) dateParams.push(endDate);

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
    WHERE 1=1 ${programFilter}
    GROUP BY cp.id
    ORDER BY cp.name`,
    [...dateParams, ...dateParams, ...(programId ? [programId] : [])],
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
  const { startDate, endDate, sessionId, format = 'json' } = req.query;
  const db = getDb();

  let query = `
    SELECT
      rl.id,
      rl.entry_type,
      rl.amount,
      rl.session_id,
      cs.name as session_name,
      rl.notes,
      rl.created_at
    FROM reimbursement_ledger rl
    LEFT JOIN concession_sessions cs ON rl.session_id = cs.id
    WHERE 1=1
  `;
  const params = [];

  if (sessionId) {
    query += ' AND rl.session_id = ?';
    params.push(sessionId);
  }
  if (startDate) {
    query += ' AND DATE(rl.created_at) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND DATE(rl.created_at) <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY rl.created_at DESC';

  db.all(
    query,
    params,
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

// GET /api/reports/session-sales - Per-session item breakdown
router.get('/session-sales', (req, res) => {
  const { startDate, endDate, sessionId, format = 'json' } = req.query;
  const db = getDb();

  let dateFilter = '';
  const params = [];

  if (sessionId) {
    dateFilter += ' AND cs.id = ?';
    params.push(sessionId);
  }
  if (startDate) {
    dateFilter += ' AND DATE(cs.started_at) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND DATE(cs.started_at) <= ?';
    params.push(endDate);
  }

  db.all(
    `SELECT
      cs.id as session_id,
      cs.name as session_name,
      DATE(cs.started_at) as session_date,
      cp.name as program_name,
      mi.name as item_name,
      SUM(oi.quantity) as quantity_sold,
      SUM(oi.quantity * oi.unit_price) as item_revenue
    FROM concession_sessions cs
    LEFT JOIN cashbox_programs cp ON cs.program_id = cp.id
    JOIN orders o ON o.session_id = cs.id
    JOIN order_items oi ON oi.order_id = o.id
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    WHERE cs.status = 'closed' ${dateFilter}
    GROUP BY cs.id, mi.id
    ORDER BY cs.started_at DESC, quantity_sold DESC`,
    params,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }

      if (format === 'csv') {
        const csv = toCSV(rows, [
          { key: 'session_id', label: 'Session ID' },
          { key: 'session_name', label: 'Session Name' },
          { key: 'session_date', label: 'Date' },
          { key: 'program_name', label: 'Program' },
          { key: 'item_name', label: 'Item' },
          { key: 'quantity_sold', label: 'Quantity Sold' },
          { key: 'item_revenue', label: 'Revenue' }
        ]);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=session-sales.csv');
        return res.send(csv);
      }

      res.json(rows);
    }
  );
});

// menu_item_components exists with two different column namings depending on when
// the database was created (see server/database.js vs. the queries in routes/).
// Detect once so the cost rollup below works against either.
let componentColumns = null;
function getComponentColumns(db, callback) {
  if (componentColumns) return callback(null, componentColumns);
  db.all('PRAGMA table_info(menu_item_components)', [], (err, cols) => {
    if (err) return callback(err);
    const names = (cols || []).map(c => c.name);
    componentColumns = {
      parent: names.includes('menu_item_id') ? 'menu_item_id' : 'composite_item_id',
      quantity: names.includes('quantity') ? 'quantity' : 'quantity_required'
    };
    callback(null, componentColumns);
  });
}

// GET /api/reports/top-items - Item popularity aggregated across sessions
//
// Ranks every item sold in the date range by units, revenue or estimated profit,
// so you can see what actually moves rather than reading one session at a time.
//
// Notes on the numbers:
//  - Practice sessions are excluded (they record no inventory or COGS).
//  - Comped units still count toward Units and Est. Cost (the stock was consumed)
//    but contribute no revenue.
//  - Per-line COGS is not stored historically, so Est. Cost uses each item's
//    current unit cost, rolled up through components for composite items.
router.get('/top-items', (req, res) => {
  const { startDate, endDate, programId, sortBy = 'units', format = 'json' } = req.query;
  const db = getDb();

  const SORT_COLUMNS = { units: 'units_sold', revenue: 'revenue', profit: 'est_profit' };
  const orderBy = SORT_COLUMNS[sortBy] || SORT_COLUMNS.units;

  let filter = '';
  const params = [];

  if (programId) {
    filter += ' AND cs.program_id = ?';
    params.push(programId);
  }
  if (startDate) {
    filter += ' AND DATE(cs.started_at) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    filter += ' AND DATE(cs.started_at) <= ?';
    params.push(endDate);
  }

  getComponentColumns(db, (colErr, cols) => {
    if (colErr) {
      return res.status(500).json({ error: 'Database error: ' + colErr.message });
    }

    // How many sessions the range covers, so a row can show "sold in 3 of 5 sessions"
    db.get(
      `SELECT COUNT(*) as total
       FROM concession_sessions cs
       WHERE cs.status = 'closed' AND COALESCE(cs.is_test, 0) = 0 ${filter}`,
      params,
      (err, sessionCount) => {
        if (err) {
          return res.status(500).json({ error: 'Database error: ' + err.message });
        }

        const totalSessions = sessionCount ? sessionCount.total : 0;

        db.all(
          `WITH item_cost AS (
             SELECT mi.id,
                    CASE
                      WHEN COALESCE(mi.is_composite, 0) = 1 OR mi.item_type = 'composite'
                      THEN COALESCE((
                        SELECT SUM(mc.${cols.quantity} * COALESCE(ci.unit_cost, 0))
                        FROM menu_item_components mc
                        JOIN menu_items ci ON ci.id = mc.component_item_id
                        WHERE mc.${cols.parent} = mi.id
                      ), 0)
                      ELSE COALESCE(mi.unit_cost, 0)
                    END AS unit_cost
             FROM menu_items mi
           )
           SELECT
             mi.name as item_name,
             SUM(oi.quantity) as units_sold,
             SUM(CASE WHEN o.is_comp = 1 THEN oi.quantity ELSE 0 END) as comp_units,
             ROUND(SUM(CASE WHEN o.is_comp = 1 THEN 0 ELSE oi.line_total END), 2) as revenue,
             ROUND(SUM(oi.quantity * ic.unit_cost), 2) as est_cost,
             ROUND(SUM(CASE WHEN o.is_comp = 1 THEN 0 ELSE oi.line_total END)
                   - SUM(oi.quantity * ic.unit_cost), 2) as est_profit,
             COUNT(DISTINCT cs.id) as sessions_sold_in,
             ${totalSessions} as total_sessions,
             ROUND(1.0 * SUM(oi.quantity) / COUNT(DISTINCT cs.id), 1) as avg_per_session
           FROM order_items oi
           JOIN orders o ON oi.order_id = o.id
           JOIN concession_sessions cs ON o.session_id = cs.id
           JOIN menu_items mi ON oi.menu_item_id = mi.id
           JOIN item_cost ic ON ic.id = mi.id
           WHERE cs.status = 'closed' AND COALESCE(cs.is_test, 0) = 0 ${filter}
           GROUP BY mi.id
           ORDER BY ${orderBy} DESC, mi.name ASC`,
          params,
          (err2, rows) => {
            if (err2) {
              return res.status(500).json({ error: 'Database error: ' + err2.message });
            }

            if (format === 'csv') {
              const csv = toCSV(rows, [
                { key: 'item_name', label: 'Item' },
                { key: 'units_sold', label: 'Units Sold' },
                { key: 'comp_units', label: 'Comped Units' },
                { key: 'revenue', label: 'Revenue' },
                { key: 'est_cost', label: 'Est. Cost' },
                { key: 'est_profit', label: 'Est. Profit' },
                { key: 'sessions_sold_in', label: 'Sessions Sold In' },
                { key: 'total_sessions', label: 'Sessions In Range' },
                { key: 'avg_per_session', label: 'Avg Units / Session' }
              ]);
              res.setHeader('Content-Type', 'text/csv');
              res.setHeader('Content-Disposition', 'attachment; filename=top-items.csv');
              return res.send(csv);
            }

            res.json(rows);
          }
        );
      }
    );
  });
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
    WHERE 1=1 ${dateFilter.replace('created_at', 'started_at')}`,
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
