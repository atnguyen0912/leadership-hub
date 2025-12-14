const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// Get all purchases
router.get('/', (req, res) => {
  const db = getDb();

  db.all(
    `SELECT p.*,
     (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id) as item_count
     FROM purchases p
     ORDER BY p.purchase_date DESC, p.created_at DESC`,
    [],
    (err, purchases) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(purchases);
    }
  );
});

// Get single purchase with items
router.get('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  db.get('SELECT * FROM purchases WHERE id = ?', [id], (err, purchase) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    db.all(
      `SELECT pi.*, m.name as menu_item_name
       FROM purchase_items pi
       LEFT JOIN menu_items m ON pi.menu_item_id = m.id
       WHERE pi.purchase_id = ?`,
      [id],
      (err, items) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        purchase.items = items;
        res.json(purchase);
      }
    );
  });
});

// Create purchase with items
router.post('/', (req, res) => {
  const db = getDb();
  const {
    vendor,
    purchaseDate,
    items,
    tax,
    deliveryFee,
    otherFees,
    notes,
    createdBy
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }

  // Calculate subtotal and distributed costs
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.lineTotal) || 0), 0);
  const totalOverhead = (parseFloat(tax) || 0) + (parseFloat(deliveryFee) || 0) + (parseFloat(otherFees) || 0);
  const total = subtotal + totalOverhead;
  const overheadPercent = subtotal > 0 ? totalOverhead / subtotal : 0;

  // Calculate distributed cost and unit cost for each item
  const processedItems = items.map(item => {
    const lineTotal = parseFloat(item.lineTotal) || 0;
    const quantity = parseInt(item.quantity) || 1;
    const distributedCost = lineTotal * (1 + overheadPercent);
    const unitCost = quantity > 0 ? distributedCost / quantity : 0;

    return {
      ...item,
      lineTotal,
      quantity,
      distributedCost: Math.round(distributedCost * 100) / 100,
      unitCost: Math.round(unitCost * 100) / 100
    };
  });

  db.run(
    `INSERT INTO purchases (vendor, purchase_date, subtotal, tax, delivery_fee, other_fees, total, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      vendor || '',
      purchaseDate || new Date().toISOString().split('T')[0],
      subtotal,
      parseFloat(tax) || 0,
      parseFloat(deliveryFee) || 0,
      parseFloat(otherFees) || 0,
      total,
      notes || '',
      createdBy || ''
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const purchaseId = this.lastID;

      // Insert each item, create inventory lot, update menu item
      let itemsProcessed = 0;
      const itemResults = [];

      processedItems.forEach((item, index) => {
        db.run(
          `INSERT INTO purchase_items (purchase_id, menu_item_id, item_name, quantity, line_total, distributed_cost, unit_cost)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            purchaseId,
            item.menuItemId || null,
            item.itemName || item.name || 'Unknown Item',
            item.quantity,
            item.lineTotal,
            item.distributedCost,
            item.unitCost
          ],
          function(itemErr) {
            if (itemErr) {
              console.error('Error inserting purchase item:', itemErr);
              itemResults.push({ error: itemErr.message });
            } else {
              const purchaseItemId = this.lastID;
              itemResults.push({ id: purchaseItemId });

              // If linked to menu item, create inventory lot and update menu item
              if (item.menuItemId) {
                // Create inventory lot
                db.run(
                  `INSERT INTO inventory_lots (menu_item_id, purchase_item_id, quantity_original, quantity_remaining, unit_cost, is_reimbursable, purchase_date)
                   VALUES (?, ?, ?, ?, ?, 1, ?)`,
                  [
                    item.menuItemId,
                    purchaseItemId,
                    item.quantity,
                    item.quantity,
                    item.unitCost,
                    purchaseDate || new Date().toISOString().split('T')[0]
                  ]
                );

                // Update menu item quantity_on_hand and unit_cost
                db.run(
                  `UPDATE menu_items
                   SET quantity_on_hand = quantity_on_hand + ?,
                       unit_cost = ?
                   WHERE id = ?`,
                  [item.quantity, item.unitCost, item.menuItemId]
                );

                // Create inventory transaction
                db.run(
                  `INSERT INTO inventory_transactions (menu_item_id, transaction_type, quantity_change, unit_cost_at_time, is_reimbursable, reference_id, notes, created_by)
                   VALUES (?, 'purchase', ?, ?, 1, ?, ?, ?)`,
                  [
                    item.menuItemId,
                    item.quantity,
                    item.unitCost,
                    purchaseId,
                    `Purchase from ${vendor || 'Unknown'}`,
                    createdBy || ''
                  ]
                );
              }
            }

            itemsProcessed++;
            if (itemsProcessed === processedItems.length) {
              res.status(201).json({
                id: purchaseId,
                vendor,
                purchaseDate,
                subtotal,
                tax: parseFloat(tax) || 0,
                deliveryFee: parseFloat(deliveryFee) || 0,
                otherFees: parseFloat(otherFees) || 0,
                total,
                overheadPercent: Math.round(overheadPercent * 10000) / 100,
                items: processedItems
              });
            }
          }
        );
      });
    }
  );
});

// Delete purchase (admin only - also removes inventory lots)
router.delete('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  // First get the purchase items to reverse inventory
  db.all(
    'SELECT * FROM purchase_items WHERE purchase_id = ?',
    [id],
    (err, items) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Reverse inventory for each item
      items.forEach(item => {
        if (item.menu_item_id) {
          // Remove from quantity_on_hand
          db.run(
            'UPDATE menu_items SET quantity_on_hand = quantity_on_hand - ? WHERE id = ?',
            [item.quantity, item.menu_item_id]
          );

          // Delete inventory lot
          db.run(
            'DELETE FROM inventory_lots WHERE purchase_item_id = ?',
            [item.id]
          );

          // Delete inventory transaction
          db.run(
            `DELETE FROM inventory_transactions WHERE reference_id = ? AND transaction_type = 'purchase' AND menu_item_id = ?`,
            [id, item.menu_item_id]
          );
        }
      });

      // Delete purchase items
      db.run('DELETE FROM purchase_items WHERE purchase_id = ?', [id], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Delete purchase
        db.run('DELETE FROM purchases WHERE id = ?', [id], function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: 'Purchase not found' });
          }

          res.json({ success: true });
        });
      });
    }
  );
});

// Stock update (manual, no receipt - non-reimbursable)
router.post('/stock-update', (req, res) => {
  const db = getDb();
  const { menuItemId, quantity, unitCost, notes, createdBy } = req.body;

  if (!menuItemId) {
    return res.status(400).json({ error: 'Menu item ID is required' });
  }

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Quantity must be greater than 0' });
  }

  const cost = parseFloat(unitCost) || 0;
  const today = new Date().toISOString().split('T')[0];

  // Create inventory lot (non-reimbursable)
  db.run(
    `INSERT INTO inventory_lots (menu_item_id, quantity_original, quantity_remaining, unit_cost, is_reimbursable, purchase_date)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [menuItemId, quantity, quantity, cost, today],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const lotId = this.lastID;

      // Update menu item
      db.run(
        `UPDATE menu_items
         SET quantity_on_hand = quantity_on_hand + ?,
             unit_cost = ?
         WHERE id = ?`,
        [quantity, cost, menuItemId]
      );

      // Create inventory transaction
      db.run(
        `INSERT INTO inventory_transactions (menu_item_id, transaction_type, quantity_change, unit_cost_at_time, is_reimbursable, notes, created_by)
         VALUES (?, 'stock_update', ?, ?, 0, ?, ?)`,
        [menuItemId, quantity, cost, notes || 'Manual stock update', createdBy || '']
      );

      res.status(201).json({
        success: true,
        lotId,
        menuItemId,
        quantity,
        unitCost: cost,
        isReimbursable: false
      });
    }
  );
});

module.exports = router;
