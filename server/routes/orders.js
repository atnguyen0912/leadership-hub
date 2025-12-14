const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// Helper function to get components for a composite item
function getComponents(db, menuItemId, callback) {
  db.all(
    `SELECT mc.*, mi.name as component_name
     FROM menu_item_components mc
     JOIN menu_items mi ON mc.component_item_id = mi.id
     WHERE mc.menu_item_id = ?`,
    [menuItemId],
    (err, components) => {
      if (err) {
        return callback(err, []);
      }
      callback(null, components || []);
    }
  );
}

// Helper function to check if an item is composite
function isCompositeItem(db, menuItemId, callback) {
  db.get(
    'SELECT is_composite FROM menu_items WHERE id = ?',
    [menuItemId],
    (err, row) => {
      if (err) {
        return callback(err, false);
      }
      callback(null, row && row.is_composite === 1);
    }
  );
}

// Helper function to deduct from FIFO lots
function deductFromLots(db, menuItemId, quantity, callback) {
  db.all(
    `SELECT * FROM inventory_lots
     WHERE menu_item_id = ? AND quantity_remaining > 0
     ORDER BY purchase_date ASC, id ASC`,
    [menuItemId],
    (err, lots) => {
      if (err) {
        return callback(err, null);
      }

      let remaining = quantity;
      let totalCost = 0;
      let reimbursableCost = 0;
      let nonReimbursableCost = 0;
      const updates = [];

      for (const lot of lots) {
        if (remaining <= 0) break;

        const deductAmount = Math.min(remaining, lot.quantity_remaining);
        const lotCost = deductAmount * (lot.unit_cost || 0);

        totalCost += lotCost;
        if (lot.is_reimbursable) {
          reimbursableCost += lotCost;
        } else {
          nonReimbursableCost += lotCost;
        }

        updates.push({
          lotId: lot.id,
          newQuantity: lot.quantity_remaining - deductAmount
        });

        remaining -= deductAmount;
      }

      // Apply updates to lots
      let updateCount = 0;
      const complete = () => {
        callback(null, {
          totalCost,
          reimbursableCost,
          nonReimbursableCost,
          quantityDeducted: quantity - remaining
        });
      };

      if (updates.length === 0) {
        return complete();
      }

      updates.forEach(update => {
        db.run(
          'UPDATE inventory_lots SET quantity_remaining = ? WHERE id = ?',
          [update.newQuantity, update.lotId],
          () => {
            updateCount++;
            if (updateCount === updates.length) {
              complete();
            }
          }
        );
      });
    }
  );
}

// POST /api/orders - Create a completed order
router.post('/', (req, res) => {
  const { sessionId, items, amountTendered, paymentMethod = 'cash', discountAmount = 0, discountChargedTo, discountReason, isComp = false } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order items are required' });
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

      const isTestSession = session.is_test === 1;

      // Calculate subtotal
      let subtotal = 0;
      items.forEach(item => {
        subtotal += item.unitPrice * item.quantity;
      });

      // Apply discount
      const discount = parseFloat(discountAmount) || 0;
      const finalTotal = Math.max(0, subtotal - discount);

      // For cash payments, calculate change
      let changeGiven = 0;
      if (paymentMethod === 'cash') {
        if (amountTendered === undefined || amountTendered === null) {
          return res.status(400).json({ error: 'Amount tendered is required for cash payments' });
        }
        changeGiven = amountTendered - finalTotal;
        if (changeGiven < 0) {
          return res.status(400).json({ error: 'Amount tendered is less than total' });
        }
      }

      // For test sessions, skip inventory processing entirely
      if (isTestSession) {
        // Just insert the order without any side effects
        db.run(
          `INSERT INTO orders (session_id, subtotal, amount_tendered, change_given, discount_amount, discount_charged_to, discount_reason, final_total, is_comp, payment_method, cogs_total, cogs_reimbursable)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
          [sessionId, subtotal, amountTendered || finalTotal, changeGiven, discount, discountChargedTo || null, discountReason || null, finalTotal, isComp ? 1 : 0, paymentMethod],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Database error: ' + err.message });
            }

            const orderId = this.lastID;

            // Insert order items (for practice tracking)
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

              // No side effects for test sessions - skip CashApp, Zelle, program charges
              res.json({
                success: true,
                orderId,
                subtotal,
                discount,
                finalTotal,
                amountTendered: amountTendered || finalTotal,
                changeGiven,
                paymentMethod,
                cogs: 0,
                cogsReimbursable: 0,
                isTest: true
              });
            });
          }
        );
        return;
      }

      // Process inventory and calculate COGS (only for real sessions)
      let totalCogs = 0;
      let reimbursableCogs = 0;
      let itemsProcessed = 0;

      // Helper to process a single inventory item (component or standalone)
      const processInventoryItem = (itemId, quantity, orderItemId, isComponent, callback) => {
        // Deduct from inventory
        db.run(
          'UPDATE menu_items SET quantity_on_hand = quantity_on_hand - ? WHERE id = ?',
          [quantity, itemId],
          (updateErr) => {
            if (updateErr) console.error('Error updating quantity:', updateErr);

            // Deduct from FIFO lots and get COGS
            deductFromLots(db, itemId, quantity, (lotErr, costInfo) => {
              if (!lotErr && costInfo) {
                totalCogs += costInfo.totalCost;
                reimbursableCogs += costInfo.reimbursableCost;
              }

              // Create inventory transaction
              const notes = isComponent ? `Order sale (component)` : `Order sale`;
              db.run(
                `INSERT INTO inventory_transactions (menu_item_id, transaction_type, quantity_change, unit_cost_at_time, is_reimbursable, notes, created_by)
                 VALUES (?, 'sale', ?, ?, ?, ?, ?)`,
                [itemId, -quantity, costInfo?.totalCost / quantity || 0, 1, notes, '']
              );

              callback(costInfo);
            });
          }
        );
      };

      const processInventory = (callback) => {
        if (items.length === 0) return callback();

        items.forEach(item => {
          // Check if this is a composite item
          isCompositeItem(db, item.menuItemId, (err, isComposite) => {
            if (err) {
              console.error('Error checking composite:', err);
              isComposite = false;
            }

            if (isComposite) {
              // Get components and deduct from each
              getComponents(db, item.menuItemId, (compErr, components) => {
                if (compErr || components.length === 0) {
                  // Fallback to direct deduction if no components found
                  processInventoryItem(item.menuItemId, item.quantity, item.menuItemId, false, () => {
                    itemsProcessed++;
                    if (itemsProcessed === items.length) {
                      callback();
                    }
                  });
                  return;
                }

                // Process each component
                let componentsProcessed = 0;
                components.forEach(comp => {
                  const componentQuantity = comp.quantity * item.quantity;
                  processInventoryItem(comp.component_item_id, componentQuantity, item.menuItemId, true, () => {
                    componentsProcessed++;
                    if (componentsProcessed === components.length) {
                      itemsProcessed++;
                      if (itemsProcessed === items.length) {
                        callback();
                      }
                    }
                  });
                });
              });
            } else {
              // Direct deduction for non-composite items
              processInventoryItem(item.menuItemId, item.quantity, item.menuItemId, false, () => {
                itemsProcessed++;
                if (itemsProcessed === items.length) {
                  callback();
                }
              });
            }
          });
        });
      };

      processInventory(() => {
        // Insert the order with all fields
        db.run(
          `INSERT INTO orders (session_id, subtotal, amount_tendered, change_given, discount_amount, discount_charged_to, discount_reason, final_total, is_comp, payment_method, cogs_total, cogs_reimbursable)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [sessionId, subtotal, amountTendered || finalTotal, changeGiven, discount, discountChargedTo || null, discountReason || null, finalTotal, isComp ? 1 : 0, paymentMethod, totalCogs, reimbursableCogs],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Database error: ' + err.message });
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

              // Handle CashApp payment
              if (paymentMethod === 'cashapp') {
                // Add to CashApp balance
                db.run('UPDATE cashapp_account SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [finalTotal]);
                db.run(
                  `INSERT INTO cashapp_transactions (transaction_type, amount, order_id, session_id)
                   VALUES ('sale', ?, ?, ?)`,
                  [finalTotal, orderId, sessionId]
                );
              }

              // Handle Zelle payment
              if (paymentMethod === 'zelle') {
                db.run(
                  `INSERT INTO zelle_payments (order_id, session_id, amount) VALUES (?, ?, ?)`,
                  [orderId, sessionId, finalTotal]
                );
                // Auto-apply to reimbursement ledger
                db.run(
                  `INSERT INTO reimbursement_ledger (entry_type, amount, session_id, reference_id, notes)
                   VALUES ('zelle_received', ?, ?, ?, 'Zelle payment auto-applied')`,
                  [finalTotal, sessionId, orderId]
                );
              }

              // Record program charge if discount charged to another program
              if (discount > 0 && discountChargedTo && discountChargedTo !== session.program_id) {
                db.run(
                  `INSERT INTO program_charges (from_program_id, session_id, order_id, amount, charge_type, reason)
                   VALUES (?, ?, ?, ?, ?, ?)`,
                  [discountChargedTo, sessionId, orderId, discount, isComp ? 'comp' : 'discount', discountReason || '']
                );
              }

              res.json({
                success: true,
                orderId,
                subtotal,
                discount,
                finalTotal,
                amountTendered: amountTendered || finalTotal,
                changeGiven,
                paymentMethod,
                cogs: totalCogs,
                cogsReimbursable: reimbursableCogs
              });
            });
          }
        );
      });
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
       COALESCE(SUM(COALESCE(final_total, subtotal)), 0) as total_revenue,
       COALESCE(SUM(COALESCE(discount_amount, 0)), 0) as total_discounts,
       COALESCE(SUM(COALESCE(cogs_total, 0)), 0) as total_cogs,
       COALESCE(SUM(COALESCE(cogs_reimbursable, 0)), 0) as total_cogs_reimbursable,
       COALESCE(AVG(subtotal), 0) as average_order,
       COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN COALESCE(final_total, subtotal) ELSE 0 END), 0) as cash_total,
       COALESCE(SUM(CASE WHEN payment_method = 'cashapp' THEN COALESCE(final_total, subtotal) ELSE 0 END), 0) as cashapp_total,
       COALESCE(SUM(CASE WHEN payment_method = 'zelle' THEN COALESCE(final_total, subtotal) ELSE 0 END), 0) as zelle_total,
       SUM(CASE WHEN is_comp = 1 THEN 1 ELSE 0 END) as comp_count
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
            totalSales: summary.total_sales,
            totalDiscounts: summary.total_discounts,
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
