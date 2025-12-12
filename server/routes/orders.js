const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// POST /api/orders - Create a completed order
router.post('/', (req, res) => {
  const { sessionId, items, amountTendered } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order items are required' });
  }
  if (amountTendered === undefined || amountTendered === null) {
    return res.status(400).json({ error: 'Amount tendered is required' });
  }

  const db = getDb();

  // Verify session exists and is active
  db.get(
    'SELECT * FROM concession_sessions WHERE id = ? AND status = ?',
    [sessionId, 'active'],
    (err, session) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!session) {
        return res.status(400).json({ error: 'Session not found or not active' });
      }

      // Calculate subtotal
      let subtotal = 0;
      items.forEach(item => {
        subtotal += item.unitPrice * item.quantity;
      });

      const changeGiven = amountTendered - subtotal;

      if (changeGiven < 0) {
        return res.status(400).json({ error: 'Amount tendered is less than subtotal' });
      }

      // Insert the order
      db.run(
        'INSERT INTO orders (session_id, subtotal, amount_tendered, change_given) VALUES (?, ?, ?, ?)',
        [sessionId, subtotal, amountTendered, changeGiven],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          const orderId = this.lastID;

          // Insert order items
          const stmt = db.prepare(
            'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?)'
          );

          items.forEach(item => {
            const lineTotal = item.unitPrice * item.quantity;
            stmt.run(orderId, item.menuItemId, item.quantity, item.unitPrice, lineTotal);
          });

          stmt.finalize((err) => {
            if (err) {
              return res.status(500).json({ error: 'Database error saving order items' });
            }

            res.json({
              success: true,
              orderId,
              subtotal,
              amountTendered,
              changeGiven
            });
          });
        }
      );
    }
  );
});

// GET /api/orders/session/:sessionId - Get orders for a session
router.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const db = getDb();

  db.all(
    `SELECT o.*,
     GROUP_CONCAT(oi.quantity || 'x ' || m.name) as items_summary
     FROM orders o
     LEFT JOIN order_items oi ON o.id = oi.order_id
     LEFT JOIN menu_items m ON oi.menu_item_id = m.id
     WHERE o.session_id = ?
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    [sessionId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// GET /api/orders/session/:sessionId/summary - Get sales summary for a session
router.get('/session/:sessionId/summary', (req, res) => {
  const { sessionId } = req.params;
  const db = getDb();

  db.get(
    `SELECT
       COUNT(*) as total_orders,
       COALESCE(SUM(subtotal), 0) as total_sales,
       COALESCE(AVG(subtotal), 0) as average_order
     FROM orders
     WHERE session_id = ?`,
    [sessionId],
    (err, summary) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Get item breakdown
      db.all(
        `SELECT m.name, SUM(oi.quantity) as total_quantity, SUM(oi.line_total) as total_sales
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         JOIN menu_items m ON oi.menu_item_id = m.id
         WHERE o.session_id = ?
         GROUP BY m.id
         ORDER BY total_quantity DESC`,
        [sessionId],
        (err, items) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          res.json({
            ...summary,
            itemBreakdown: items
          });
        }
      );
    }
  );
});

// GET /api/orders/:id - Get a single order with items
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  db.get('SELECT * FROM orders WHERE id = ?', [id], (err, order) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    db.all(
      `SELECT oi.*, m.name as item_name
       FROM order_items oi
       JOIN menu_items m ON oi.menu_item_id = m.id
       WHERE oi.order_id = ?`,
      [id],
      (err, items) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({
          ...order,
          items
        });
      }
    );
  });
});

module.exports = router;
