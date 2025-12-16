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

// Get last purchase quantity for a menu item (for auto-populate hints)
router.get('/last-quantity/:menuItemId', (req, res) => {
  const db = getDb();
  const { menuItemId } = req.params;

  db.get(
    `SELECT pi.quantity, p.purchase_date
     FROM purchase_items pi
     JOIN purchases p ON pi.purchase_id = p.id
     WHERE pi.menu_item_id = ?
     ORDER BY p.purchase_date DESC, p.created_at DESC
     LIMIT 1`,
    [menuItemId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(row || { quantity: null, purchase_date: null });
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

  // Calculate subtotal (line totals only) and total CRV
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.lineTotal) || 0), 0);
  const totalCrv = items.reduce((sum, item) => {
    const qty = parseInt(item.quantity) || 1;
    const crvPerUnit = parseFloat(item.crvPerUnit) || 0;
    return sum + (crvPerUnit * qty);
  }, 0);
  const totalOverhead = (parseFloat(tax) || 0) + (parseFloat(deliveryFee) || 0) + (parseFloat(otherFees) || 0);
  // Total includes subtotal + CRV + overhead
  const total = subtotal + totalCrv + totalOverhead;
  // Overhead is distributed based on subtotal + CRV (the base product cost)
  const baseCost = subtotal + totalCrv;
  const overheadPercent = baseCost > 0 ? totalOverhead / baseCost : 0;

  // Calculate distributed cost and unit cost for each item (including CRV)
  const processedItems = items.map(item => {
    const lineTotal = parseFloat(item.lineTotal) || 0;
    const quantity = parseInt(item.quantity) || 1;
    const crvPerUnit = parseFloat(item.crvPerUnit) || 0;
    const crvTotal = crvPerUnit * quantity;
    // Include CRV in the base cost before overhead distribution
    const itemBaseCost = lineTotal + crvTotal;
    const distributedCost = itemBaseCost * (1 + overheadPercent);
    const unitCost = quantity > 0 ? distributedCost / quantity : 0;

    return {
      ...item,
      lineTotal,
      quantity,
      crvPerUnit,
      crvTotal: Math.round(crvTotal * 100) / 100,
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
          `INSERT INTO purchase_items (purchase_id, menu_item_id, item_name, quantity, line_total, distributed_cost, unit_cost, crv_per_unit, crv_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            purchaseId,
            item.menuItemId || null,
            item.itemName || item.name || 'Unknown Item',
            item.quantity,
            item.lineTotal,
            item.distributedCost,
            item.unitCost,
            item.crvPerUnit || 0,
            item.crvTotal || 0
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
                // Check if item is a producer (is_liquid) - these are tracked by fill % not quantity
                db.get('SELECT is_liquid FROM menu_items WHERE id = ?', [item.menuItemId], (err, menuItem) => {
                  if (err) {
                    console.error('Error checking is_liquid:', err);
                  }

                  if (menuItem && menuItem.is_liquid) {
                    // Producer item: set fill_percentage to 100% (restocked) instead of tracking quantity
                    db.run(
                      `UPDATE menu_items
                       SET fill_percentage = 100,
                           unit_cost = ?
                       WHERE id = ?`,
                      [item.unitCost, item.menuItemId]
                    );

                    // Create inventory transaction for producer restock
                    db.run(
                      `INSERT INTO inventory_transactions (menu_item_id, transaction_type, quantity_change, unit_cost_at_time, is_reimbursable, reference_id, notes, created_by)
                       VALUES (?, 'purchase', 1, ?, 1, ?, ?, ?)`,
                      [
                        item.menuItemId,
                        item.unitCost,
                        purchaseId,
                        `Producer item restocked from ${vendor || 'Unknown'}`,
                        createdBy || ''
                      ]
                    );
                  } else {
                    // Regular item: create inventory lot and track quantity
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
                });
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

// Update existing purchase with items (full edit)
router.put('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const {
    vendor,
    purchaseDate,
    items,
    tax,
    deliveryFee,
    otherFees,
    notes
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }

  // 1. Get existing purchase
  db.get('SELECT * FROM purchases WHERE id = ?', [id], (err, existingPurchase) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!existingPurchase) return res.status(404).json({ error: 'Purchase not found' });

    // 2. Get existing items to reverse inventory
    db.all('SELECT * FROM purchase_items WHERE purchase_id = ?', [id], (err, existingItems) => {
      if (err) return res.status(500).json({ error: err.message });

      // 3. Reverse inventory for ALL existing items
      let reversalsCompleted = 0;
      const totalReversals = existingItems.filter(i => i.menu_item_id).length;

      const proceedWithUpdate = () => {
        // 4. Delete old purchase items
        db.run('DELETE FROM purchase_items WHERE purchase_id = ?', [id], (err) => {
          if (err) return res.status(500).json({ error: err.message });

          // 5. Calculate new totals (including CRV)
          const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.lineTotal) || 0), 0);
          const totalCrv = items.reduce((sum, item) => {
            const qty = parseInt(item.quantity) || 1;
            const crvPerUnit = parseFloat(item.crvPerUnit) || 0;
            return sum + (crvPerUnit * qty);
          }, 0);
          const totalOverhead = (parseFloat(tax) || 0) + (parseFloat(deliveryFee) || 0) + (parseFloat(otherFees) || 0);
          // Total includes subtotal + CRV + overhead
          const total = subtotal + totalCrv + totalOverhead;
          // Overhead is distributed based on subtotal + CRV (the base product cost)
          const baseCost = subtotal + totalCrv;
          const overheadPercent = baseCost > 0 ? totalOverhead / baseCost : 0;

          // 6. Process new items with CRV
          const processedItems = items.map(item => {
            const lineTotal = parseFloat(item.lineTotal) || 0;
            const quantity = parseInt(item.quantity) || 1;
            const crvPerUnit = parseFloat(item.crvPerUnit) || 0;
            const crvTotal = crvPerUnit * quantity;
            const baseCost = lineTotal + crvTotal;
            const distributedCost = baseCost * (1 + overheadPercent);
            const unitCost = quantity > 0 ? distributedCost / quantity : 0;

            return {
              ...item,
              lineTotal,
              quantity,
              crvPerUnit,
              crvTotal: Math.round(crvTotal * 100) / 100,
              distributedCost: Math.round(distributedCost * 100) / 100,
              unitCost: Math.round(unitCost * 100) / 100
            };
          });

          // 7. Update purchase header
          db.run(
            `UPDATE purchases SET vendor = ?, purchase_date = ?, subtotal = ?,
             tax = ?, delivery_fee = ?, other_fees = ?, total = ?, notes = ?
             WHERE id = ?`,
            [
              vendor || '',
              purchaseDate,
              subtotal,
              parseFloat(tax) || 0,
              parseFloat(deliveryFee) || 0,
              parseFloat(otherFees) || 0,
              total,
              notes || '',
              id
            ],
            function(err) {
              if (err) return res.status(500).json({ error: err.message });

              // 8. Insert new items and create new inventory lots
              let itemsProcessed = 0;

              processedItems.forEach((item) => {
                db.run(
                  `INSERT INTO purchase_items (purchase_id, menu_item_id, item_name, quantity, line_total, distributed_cost, unit_cost, crv_per_unit, crv_total)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    id,
                    item.menuItemId || null,
                    item.itemName || 'Unknown Item',
                    item.quantity,
                    item.lineTotal,
                    item.distributedCost,
                    item.unitCost,
                    item.crvPerUnit || 0,
                    item.crvTotal || 0
                  ],
                  function(itemErr) {
                    if (!itemErr && item.menuItemId) {
                      const purchaseItemId = this.lastID;

                      // Check if item is a producer (is_liquid)
                      db.get('SELECT is_liquid FROM menu_items WHERE id = ?', [item.menuItemId], (err, menuItem) => {
                        if (menuItem && menuItem.is_liquid) {
                          // Producer item: set fill_percentage to 100%
                          db.run(
                            `UPDATE menu_items SET fill_percentage = 100, unit_cost = ? WHERE id = ?`,
                            [item.unitCost, item.menuItemId]
                          );
                          db.run(
                            `INSERT INTO inventory_transactions (menu_item_id, transaction_type, quantity_change, unit_cost_at_time, is_reimbursable, reference_id, notes, created_by)
                             VALUES (?, 'purchase', 1, ?, 1, ?, ?, '')`,
                            [item.menuItemId, item.unitCost, id, `Producer item restocked from ${vendor || 'Unknown'}`]
                          );
                        } else {
                          // Regular item: create new inventory lot
                          db.run(
                            `INSERT INTO inventory_lots (menu_item_id, purchase_item_id, quantity_original, quantity_remaining, unit_cost, is_reimbursable, purchase_date)
                             VALUES (?, ?, ?, ?, ?, 1, ?)`,
                            [item.menuItemId, purchaseItemId, item.quantity, item.quantity, item.unitCost, purchaseDate]
                          );

                          // Update menu item quantity
                          db.run(
                            `UPDATE menu_items SET quantity_on_hand = quantity_on_hand + ?, unit_cost = ? WHERE id = ?`,
                            [item.quantity, item.unitCost, item.menuItemId]
                          );

                          // Create inventory transaction
                          db.run(
                            `INSERT INTO inventory_transactions (menu_item_id, transaction_type, quantity_change, unit_cost_at_time, is_reimbursable, reference_id, notes, created_by)
                             VALUES (?, 'purchase', ?, ?, 1, ?, ?, '')`,
                            [item.menuItemId, item.quantity, item.unitCost, id, `Purchase update from ${vendor || 'Unknown'}`]
                          );
                        }
                      });
                    }

                    itemsProcessed++;
                    if (itemsProcessed === processedItems.length) {
                      res.json({
                        success: true,
                        id: parseInt(id),
                        vendor,
                        purchaseDate,
                        subtotal,
                        total,
                        items: processedItems
                      });
                    }
                  }
                );
              });
            }
          );
        });
      };

      // Execute inventory reversals
      if (totalReversals === 0) {
        proceedWithUpdate();
      } else {
        existingItems.forEach(item => {
          if (item.menu_item_id) {
            // Check if producer item (is_liquid)
            db.get('SELECT is_liquid FROM menu_items WHERE id = ?', [item.menu_item_id], (err, menuItem) => {
              if (menuItem && menuItem.is_liquid) {
                // Producer item: only delete inventory transaction (fill % unchanged)
                db.run(
                  `DELETE FROM inventory_transactions WHERE reference_id = ? AND transaction_type = 'purchase' AND menu_item_id = ?`,
                  [id, item.menu_item_id],
                  () => {
                    reversalsCompleted++;
                    if (reversalsCompleted === totalReversals) {
                      proceedWithUpdate();
                    }
                  }
                );
              } else {
                // Regular item: reverse quantity and delete lot
                db.run(
                  'UPDATE menu_items SET quantity_on_hand = quantity_on_hand - ? WHERE id = ?',
                  [item.quantity, item.menu_item_id]
                );
                db.run('DELETE FROM inventory_lots WHERE purchase_item_id = ?', [item.id]);
                db.run(
                  `DELETE FROM inventory_transactions WHERE reference_id = ? AND transaction_type = 'purchase' AND menu_item_id = ?`,
                  [id, item.menu_item_id],
                  () => {
                    reversalsCompleted++;
                    if (reversalsCompleted === totalReversals) {
                      proceedWithUpdate();
                    }
                  }
                );
              }
            });
          }
        });
      }
    });
  });
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
          // Check if producer item (is_liquid) - don't reverse quantity for these
          db.get('SELECT is_liquid FROM menu_items WHERE id = ?', [item.menu_item_id], (err, menuItem) => {
            if (menuItem && menuItem.is_liquid) {
              // Producer item: only delete the inventory transaction (fill % stays unchanged)
              db.run(
                `DELETE FROM inventory_transactions WHERE reference_id = ? AND transaction_type = 'purchase' AND menu_item_id = ?`,
                [id, item.menu_item_id]
              );
            } else {
              // Regular item: reverse quantity and delete lot
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
