const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db-utils');

// Helper function to get components for a composite item
async function getComponents(menuItemId) {
  return await all(
    `SELECT mc.*, mi.name as component_name
     FROM menu_item_components mc
     JOIN menu_items mi ON mc.component_item_id = mi.id
     WHERE mc.menu_item_id = ?`,
    [menuItemId]
  );
}

// Helper function to check if an item is composite
async function isCompositeItem(menuItemId) {
  const row = await get('SELECT is_composite FROM menu_items WHERE id = ?', [menuItemId]);
  return row && row.is_composite === 1;
}

// Helper function to deduct from FIFO lots
async function deductFromLots(menuItemId, quantity) {
  const lots = await all(
    `SELECT * FROM inventory_lots
     WHERE menu_item_id = ? AND quantity_remaining > 0
     ORDER BY purchase_date ASC, id ASC`,
    [menuItemId]
  );

  let remaining = quantity;
  let totalCost = 0;
  let reimbursableCost = 0;
  let nonReimbursableCost = 0;

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

    await run(
      'UPDATE inventory_lots SET quantity_remaining = ? WHERE id = ?',
      [lot.quantity_remaining - deductAmount, lot.id]
    );

    remaining -= deductAmount;
  }

  return {
    totalCost,
    reimbursableCost,
    nonReimbursableCost,
    quantityDeducted: quantity - remaining
  };
}

// Helper to process a single inventory item
async function processInventoryItem(itemId, quantity, isComponent) {
  // Deduct from inventory
  await run(
    'UPDATE menu_items SET quantity_on_hand = quantity_on_hand - ? WHERE id = ?',
    [quantity, itemId]
  );

  // Deduct from FIFO lots and get COGS
  const costInfo = await deductFromLots(itemId, quantity);

  // Create inventory transaction
  const notes = isComponent ? 'Order sale (component)' : 'Order sale';
  await run(
    `INSERT INTO inventory_transactions (menu_item_id, transaction_type, quantity_change, unit_cost_at_time, is_reimbursable, notes, created_by)
     VALUES (?, 'sale', ?, ?, ?, ?, ?)`,
    [itemId, -quantity, costInfo.totalCost / quantity || 0, 1, notes, '']
  );

  return costInfo;
}

// POST /api/orders - Create a completed order
router.post('/', async (req, res) => {
  try {
    const { sessionId, items, amountTendered, paymentMethod = 'cash', discountAmount = 0, discountChargedTo, discountReason, isComp = false } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order items are required' });
    }

    // Verify session exists and is active
    const session = await get(
      'SELECT * FROM concession_sessions WHERE id = ? AND status = ?',
      [sessionId, 'active']
    );

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

    let totalCogs = 0;
    let reimbursableCogs = 0;

    // Process inventory (skip for test sessions)
    if (!isTestSession) {
      for (const item of items) {
        const isComposite = await isCompositeItem(item.menuItemId);

        if (isComposite) {
          const components = await getComponents(item.menuItemId);
          if (components.length > 0) {
            for (const comp of components) {
              const componentQuantity = comp.quantity * item.quantity;
              const costInfo = await processInventoryItem(comp.component_item_id, componentQuantity, true);
              totalCogs += costInfo.totalCost;
              reimbursableCogs += costInfo.reimbursableCost;
            }
          } else {
            // Fallback to direct deduction if no components found
            const costInfo = await processInventoryItem(item.menuItemId, item.quantity, false);
            totalCogs += costInfo.totalCost;
            reimbursableCogs += costInfo.reimbursableCost;
          }
        } else {
          const costInfo = await processInventoryItem(item.menuItemId, item.quantity, false);
          totalCogs += costInfo.totalCost;
          reimbursableCogs += costInfo.reimbursableCost;
        }
      }
    }

    // Insert the order
    const orderResult = await run(
      `INSERT INTO orders (session_id, subtotal, amount_tendered, change_given, discount_amount, discount_charged_to, discount_reason, final_total, is_comp, payment_method, cogs_total, cogs_reimbursable)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, subtotal, amountTendered || finalTotal, changeGiven, discount, discountChargedTo || null, discountReason || null, finalTotal, isComp ? 1 : 0, paymentMethod, totalCogs, reimbursableCogs]
    );

    const orderId = orderResult.lastID;

    // Insert order items
    for (const item of items) {
      const lineTotal = item.unitPrice * item.quantity;
      await run(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.menuItemId, item.quantity, item.unitPrice, lineTotal]
      );
    }

    // Skip side effects for test sessions
    if (!isTestSession) {
      // Handle CashApp payment
      if (paymentMethod === 'cashapp') {
        await run('UPDATE cashapp_account SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [finalTotal]);
        await run(
          `INSERT INTO cashapp_transactions (transaction_type, amount, order_id, session_id)
           VALUES ('sale', ?, ?, ?)`,
          [finalTotal, orderId, sessionId]
        );
      }

      // Handle Zelle payment
      if (paymentMethod === 'zelle') {
        await run(
          `INSERT INTO zelle_payments (order_id, session_id, amount) VALUES (?, ?, ?)`,
          [orderId, sessionId, finalTotal]
        );
        await run(
          `INSERT INTO reimbursement_ledger (entry_type, amount, session_id, reference_id, notes)
           VALUES ('zelle_received', ?, ?, ?, 'Zelle payment auto-applied')`,
          [finalTotal, sessionId, orderId]
        );
      }

      // Record program charge if discount charged to another program
      if (discount > 0 && discountChargedTo && discountChargedTo !== session.program_id) {
        await run(
          `INSERT INTO program_charges (from_program_id, session_id, order_id, amount, charge_type, reason)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [discountChargedTo, sessionId, orderId, discount, isComp ? 'comp' : 'discount', discountReason || '']
        );
      }
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
      cogsReimbursable: reimbursableCogs,
      isTest: isTestSession
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// GET /api/orders/session/:sessionId - Get orders for a session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const rows = await all(
      `SELECT o.*,
       GROUP_CONCAT(oi.quantity || 'x ' || m.name) as items_summary
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN menu_items m ON oi.menu_item_id = m.id
       WHERE o.session_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [sessionId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/orders/session/:sessionId/summary - Get sales summary for a session
router.get('/session/:sessionId/summary', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const summary = await get(
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
      [sessionId]
    );

    const items = await all(
      `SELECT m.name, SUM(oi.quantity) as total_quantity, SUM(oi.line_total) as total_sales
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN menu_items m ON oi.menu_item_id = m.id
       WHERE o.session_id = ?
       GROUP BY m.id
       ORDER BY total_quantity DESC`,
      [sessionId]
    );

    res.json({
      ...summary,
      totalSales: summary.total_sales,
      totalDiscounts: summary.total_discounts,
      itemBreakdown: items
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/orders/:id - Get a single order with items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = await all(
      `SELECT oi.*, m.name as item_name
       FROM order_items oi
       JOIN menu_items m ON oi.menu_item_id = m.id
       WHERE oi.order_id = ?`,
      [id]
    );

    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
