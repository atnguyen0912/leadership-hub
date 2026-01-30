const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// Get all inventory items with quantities and FIFO costs
router.get('/', (req, res) => {
  const db = getDb();

  db.all(
    `SELECT m.id, m.name, m.price, m.unit_cost, m.quantity_on_hand, m.track_inventory, m.is_composite, m.parent_id, m.active,
     m.fill_percentage, m.is_liquid, m.item_type, m.container_name, m.servings_per_container, m.cost_per_container,
     m.last_inventory_check, m.last_checked_by,
     CASE
       WHEN m.last_inventory_check >= date('now', '-7 days') THEN 'verified'
       WHEN m.last_inventory_check >= date('now', '-14 days') THEN 'estimated'
       WHEN m.last_inventory_check IS NOT NULL THEN 'stale'
       ELSE 'never'
     END as inventory_confidence,
     CAST(julianday('now') - julianday(m.last_inventory_check) AS INTEGER) as days_since_check,
     (SELECT SUM(quantity_remaining) FROM inventory_lots WHERE menu_item_id = m.id) as lot_quantity
     FROM menu_items m
     WHERE m.price IS NOT NULL OR m.item_type IN ('ingredient', 'bulk_ingredient')
     ORDER BY m.name`,
    [],
    (err, items) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(items);
    }
  );
});

// GET /api/inventory/verification-status - Get verification status for all inventory items
router.get('/verification-status', (req, res) => {
  const db = getDb();

  db.all(
    `SELECT
      m.id, m.name, m.item_type, m.quantity_on_hand,
      m.last_inventory_check, m.last_checked_by,
      m.container_name, m.servings_per_container,
      CASE
        WHEN m.last_inventory_check >= date('now', '-7 days') THEN 'verified'
        WHEN m.last_inventory_check >= date('now', '-14 days') THEN 'estimated'
        WHEN m.last_inventory_check IS NOT NULL THEN 'stale'
        ELSE 'never'
      END as inventory_confidence,
      CAST(julianday('now') - julianday(m.last_inventory_check) AS INTEGER) as days_since_check
     FROM menu_items m
     WHERE m.active = 1
       AND m.track_inventory = 1
       AND (m.price IS NOT NULL OR m.item_type IN ('ingredient', 'bulk_ingredient'))
     ORDER BY
       CASE
         WHEN m.last_inventory_check IS NULL THEN 0
         WHEN m.last_inventory_check < date('now', '-14 days') THEN 1
         WHEN m.last_inventory_check < date('now', '-7 days') THEN 2
         ELSE 3
       END,
       m.name`,
    [],
    (err, items) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Calculate summary
      const summary = {
        verified: items.filter(i => i.inventory_confidence === 'verified').length,
        estimated: items.filter(i => i.inventory_confidence === 'estimated').length,
        stale: items.filter(i => i.inventory_confidence === 'stale').length,
        never: items.filter(i => i.inventory_confidence === 'never').length
      };

      res.json({ items, summary });
    }
  );
});

// POST /api/inventory/verify - Record inventory verification for one or more items
router.post('/verify', (req, res) => {
  const db = getDb();
  const { sessionId, verificationType, verifiedBy, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  const validTypes = ['start', 'end', 'standalone'];
  const finalType = validTypes.includes(verificationType) ? verificationType : 'standalone';

  let processed = 0;
  const results = [];
  const errors = [];
  const discrepancies = [];

  items.forEach(item => {
    const { menuItemId, actualQuantity } = item;

    // Get current system quantity
    db.get('SELECT * FROM menu_items WHERE id = ?', [menuItemId], (err, menuItem) => {
      if (err) {
        errors.push({ menuItemId, error: err.message });
        processed++;
        checkComplete();
        return;
      }

      if (!menuItem) {
        errors.push({ menuItemId, error: 'Item not found' });
        processed++;
        checkComplete();
        return;
      }

      const systemQuantity = menuItem.quantity_on_hand || 0;
      const discrepancy = actualQuantity - systemQuantity;

      // Insert verification record
      db.run(
        `INSERT INTO inventory_verifications
         (menu_item_id, session_id, verification_type, system_quantity, actual_quantity, discrepancy, verified_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [menuItemId, sessionId || null, finalType, systemQuantity, actualQuantity, discrepancy, verifiedBy || ''],
        function(insertErr) {
          if (insertErr) {
            errors.push({ menuItemId, error: insertErr.message });
            processed++;
            checkComplete();
            return;
          }

          const verificationId = this.lastID;

          // Update menu item with verification info and actual quantity
          db.run(
            `UPDATE menu_items SET
             quantity_on_hand = ?,
             last_inventory_check = date('now'),
             last_checked_by = ?
             WHERE id = ?`,
            [actualQuantity, verifiedBy || '', menuItemId],
            (updateErr) => {
              if (updateErr) {
                errors.push({ menuItemId, error: updateErr.message });
              } else {
                results.push({
                  verificationId,
                  menuItemId,
                  name: menuItem.name,
                  systemQuantity,
                  actualQuantity,
                  discrepancy
                });

                if (discrepancy !== 0) {
                  discrepancies.push({
                    menuItemId,
                    name: menuItem.name,
                    discrepancy,
                    unitCost: menuItem.unit_cost || 0,
                    costImpact: discrepancy * (menuItem.unit_cost || 0)
                  });
                }
              }

              processed++;
              checkComplete();
            }
          );
        }
      );
    });
  });

  function checkComplete() {
    if (processed === items.length) {
      if (errors.length > 0 && results.length === 0) {
        return res.status(400).json({ error: 'All verifications failed', errors });
      }

      res.json({
        success: true,
        results,
        discrepancies,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          verified: results.length,
          discrepancyCount: discrepancies.length,
          totalDiscrepancyCost: discrepancies.reduce((sum, d) => sum + d.costImpact, 0)
        }
      });
    }
  }
});

// Get lots for a specific item
router.get('/:id/lots', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  db.all(
    `SELECT il.*, p.vendor, p.purchase_date as purchase_purchase_date
     FROM inventory_lots il
     LEFT JOIN purchase_items pi ON il.purchase_item_id = pi.id
     LEFT JOIN purchases p ON pi.purchase_id = p.id
     WHERE il.menu_item_id = ? AND il.quantity_remaining > 0
     ORDER BY il.purchase_date ASC, il.id ASC`,
    [id],
    (err, lots) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(lots);
    }
  );
});

// Manual inventory adjustment (lost/wasted/donated/count_adjustment)
router.post('/:id/adjust', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { adjustmentType, quantity, notes, createdBy } = req.body;

  const validTypes = ['lost', 'wasted', 'donated', 'count_adjustment'];
  if (!validTypes.includes(adjustmentType)) {
    return res.status(400).json({ error: 'Invalid adjustment type' });
  }

  if (!quantity || quantity === 0) {
    return res.status(400).json({ error: 'Quantity is required' });
  }

  // Get current menu item
  db.get('SELECT * FROM menu_items WHERE id = ?', [id], (err, item) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const quantityChange = parseInt(quantity);
    const newQuantity = (item.quantity_on_hand || 0) + quantityChange;

    if (newQuantity < 0) {
      return res.status(400).json({ error: 'Adjustment would result in negative inventory' });
    }

    // If decreasing (negative adjustment), deduct from FIFO lots
    if (quantityChange < 0) {
      deductFromLots(db, id, Math.abs(quantityChange), adjustmentType, (deductErr, costInfo) => {
        if (deductErr) {
          return res.status(500).json({ error: deductErr.message });
        }

        // Update menu item quantity
        db.run(
          'UPDATE menu_items SET quantity_on_hand = ? WHERE id = ?',
          [newQuantity, id],
          (updateErr) => {
            if (updateErr) {
              return res.status(500).json({ error: updateErr.message });
            }

            // Create inventory transaction
            db.run(
              `INSERT INTO inventory_transactions (menu_item_id, transaction_type, quantity_change, unit_cost_at_time, is_reimbursable, notes, created_by)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [id, adjustmentType, quantityChange, costInfo.avgCost, costInfo.reimbursable ? 1 : 0, notes || '', createdBy || ''],
              function(txErr) {
                if (txErr) {
                  return res.status(500).json({ error: txErr.message });
                }

                res.json({
                  success: true,
                  itemId: id,
                  adjustmentType,
                  quantityChange,
                  newQuantity,
                  costInfo
                });
              }
            );
          }
        );
      });
    } else {
      // Positive adjustment - just update quantity
      db.run(
        'UPDATE menu_items SET quantity_on_hand = ? WHERE id = ?',
        [newQuantity, id],
        (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ error: updateErr.message });
          }

          // Create inventory transaction
          db.run(
            `INSERT INTO inventory_transactions (menu_item_id, transaction_type, quantity_change, unit_cost_at_time, is_reimbursable, notes, created_by)
             VALUES (?, ?, ?, ?, 0, ?, ?)`,
            [id, adjustmentType, quantityChange, 0, notes || '', createdBy || ''],
            function(txErr) {
              if (txErr) {
                return res.status(500).json({ error: txErr.message });
              }

              res.json({
                success: true,
                itemId: id,
                adjustmentType,
                quantityChange,
                newQuantity
              });
            }
          );
        }
      );
    }
  });
});

// Submit inventory count
router.post('/count', (req, res) => {
  const db = getDb();
  const { sessionId, counts, countedBy } = req.body;

  if (!counts || !Array.isArray(counts) || counts.length === 0) {
    return res.status(400).json({ error: 'Counts are required' });
  }

  let processed = 0;
  const results = [];
  const errors = [];

  counts.forEach(count => {
    const { menuItemId, expectedQuantity, actualQuantity } = count;
    const discrepancy = actualQuantity - expectedQuantity;

    // Get item cost for cost impact calculation
    db.get('SELECT unit_cost FROM menu_items WHERE id = ?', [menuItemId], (err, item) => {
      if (err) {
        errors.push({ menuItemId, error: err.message });
        processed++;
        checkComplete();
        return;
      }

      const unitCost = item?.unit_cost || 0;
      const costImpact = discrepancy * unitCost;

      // Insert count record
      db.run(
        `INSERT INTO inventory_counts (session_id, menu_item_id, expected_quantity, actual_quantity, discrepancy, cost_impact, counted_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sessionId || null, menuItemId, expectedQuantity, actualQuantity, discrepancy, costImpact, countedBy || ''],
        function(insertErr) {
          if (insertErr) {
            errors.push({ menuItemId, error: insertErr.message });
            processed++;
            checkComplete();
            return;
          }

          const countId = this.lastID;

          // If there's a discrepancy, adjust inventory
          if (discrepancy !== 0) {
            // Update menu item quantity to actual
            db.run(
              'UPDATE menu_items SET quantity_on_hand = ? WHERE id = ?',
              [actualQuantity, menuItemId],
              (updateErr) => {
                if (updateErr) {
                  errors.push({ menuItemId, error: updateErr.message });
                }

                // Create inventory transaction for the adjustment
                db.run(
                  `INSERT INTO inventory_transactions (menu_item_id, transaction_type, quantity_change, unit_cost_at_time, is_reimbursable, reference_id, notes, created_by)
                   VALUES (?, 'count_adjustment', ?, ?, 1, ?, ?, ?)`,
                  [menuItemId, discrepancy, unitCost, countId, `Inventory count adjustment`, countedBy || '']
                );

                // If negative discrepancy, record as loss
                if (discrepancy < 0) {
                  db.run(
                    `INSERT INTO losses (session_id, loss_type, amount, description, recorded_by)
                     VALUES (?, 'inventory_discrepancy', ?, ?, ?)`,
                    [sessionId || null, Math.abs(costImpact), `Inventory count: expected ${expectedQuantity}, actual ${actualQuantity}`, countedBy || '']
                  );
                }

                results.push({
                  countId,
                  menuItemId,
                  expectedQuantity,
                  actualQuantity,
                  discrepancy,
                  costImpact
                });

                processed++;
                checkComplete();
              }
            );
          } else {
            results.push({
              countId,
              menuItemId,
              expectedQuantity,
              actualQuantity,
              discrepancy: 0,
              costImpact: 0
            });
            processed++;
            checkComplete();
          }
        }
      );
    });
  });

  function checkComplete() {
    if (processed === counts.length) {
      if (errors.length > 0) {
        return res.status(207).json({ results, errors });
      }
      res.json({ success: true, results });
    }
  }
});

// Get inventory transactions (audit log)
router.get('/transactions', (req, res) => {
  const db = getDb();
  const { menuItemId, limit = 100 } = req.query;

  let query = `
    SELECT it.*, m.name as menu_item_name
    FROM inventory_transactions it
    JOIN menu_items m ON it.menu_item_id = m.id
  `;
  const params = [];

  if (menuItemId) {
    query += ' WHERE it.menu_item_id = ?';
    params.push(menuItemId);
  }

  query += ' ORDER BY it.created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(query, params, (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(transactions);
  });
});

// Get inventory counts history
router.get('/counts', (req, res) => {
  const db = getDb();
  const { sessionId, limit = 50 } = req.query;

  let query = `
    SELECT ic.*, m.name as menu_item_name
    FROM inventory_counts ic
    JOIN menu_items m ON ic.menu_item_id = m.id
  `;
  const params = [];

  if (sessionId) {
    query += ' WHERE ic.session_id = ?';
    params.push(sessionId);
  }

  query += ' ORDER BY ic.created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(query, params, (err, counts) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(counts);
  });
});

// Mark usage percentage for liquid items (jars, bottles, etc.)
router.post('/:id/mark-usage', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { usagePercent, createdBy } = req.body;

  if (usagePercent === undefined || usagePercent < 0 || usagePercent > 100) {
    return res.status(400).json({ error: 'Usage percent must be between 0 and 100' });
  }

  // Get current item state
  db.get('SELECT * FROM menu_items WHERE id = ?', [id], (err, item) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const currentFill = item.fill_percentage || 100;
    const newFill = Math.max(0, currentFill - usagePercent);

    // Check if the item is now empty (0% fill)
    if (newFill <= 0 && item.quantity_on_hand > 0) {
      // Decrement quantity and reset fill to 100%
      const newQuantity = item.quantity_on_hand - 1;
      const resetFill = newQuantity > 0 ? 100 : 0;

      // Deduct from FIFO lots
      deductFromLots(db, id, 1, 'sale', (deductErr, costInfo) => {
        if (deductErr) {
          console.warn('FIFO deduction failed:', deductErr.message);
        }

        db.run(
          'UPDATE menu_items SET quantity_on_hand = ?, fill_percentage = ? WHERE id = ?',
          [newQuantity, resetFill, id],
          (updateErr) => {
            if (updateErr) {
              return res.status(500).json({ error: updateErr.message });
            }

            // Log the transaction
            db.run(
              `INSERT INTO inventory_transactions (menu_item_id, transaction_type, quantity_change, unit_cost_at_time, is_reimbursable, notes, created_by)
               VALUES (?, 'sale', -1, ?, ?, ?, ?)`,
              [id, costInfo?.avgCost || item.unit_cost || 0, costInfo?.reimbursable ? 1 : 0, `Liquid item emptied (was ${currentFill}%)`, createdBy || '']
            );

            res.json({
              success: true,
              itemId: id,
              previousFill: currentFill,
              newFill: resetFill,
              quantityDecremented: true,
              newQuantity
            });
          }
        );
      });
    } else {
      // Just update the fill percentage
      db.run(
        'UPDATE menu_items SET fill_percentage = ? WHERE id = ?',
        [newFill, id],
        (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ error: updateErr.message });
          }

          res.json({
            success: true,
            itemId: id,
            previousFill: currentFill,
            newFill,
            quantityDecremented: false,
            newQuantity: item.quantity_on_hand
          });
        }
      );
    }
  });
});

// Set fill percentage directly (for manual adjustments)
router.put('/:id/fill', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { fillPercentage } = req.body;

  if (fillPercentage === undefined || fillPercentage < 0 || fillPercentage > 100) {
    return res.status(400).json({ error: 'Fill percentage must be between 0 and 100' });
  }

  db.run(
    'UPDATE menu_items SET fill_percentage = ? WHERE id = ?',
    [fillPercentage, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json({ success: true, itemId: id, fillPercentage });
    }
  );
});

// Toggle liquid flag for an item
router.put('/:id/liquid', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { isLiquid } = req.body;

  db.run(
    'UPDATE menu_items SET is_liquid = ? WHERE id = ?',
    [isLiquid ? 1 : 0, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json({ success: true, itemId: id, isLiquid: !!isLiquid });
    }
  );
});

// Helper function to deduct from FIFO lots
function deductFromLots(db, menuItemId, quantity, transactionType, callback) {
  db.all(
    `SELECT * FROM inventory_lots
     WHERE menu_item_id = ? AND quantity_remaining > 0
     ORDER BY purchase_date ASC, id ASC`,
    [menuItemId],
    (err, lots) => {
      if (err) {
        return callback(err);
      }

      let remaining = quantity;
      let totalCost = 0;
      let reimbursableAmount = 0;
      let nonReimbursableAmount = 0;
      const updates = [];

      for (const lot of lots) {
        if (remaining <= 0) break;

        const deductAmount = Math.min(remaining, lot.quantity_remaining);
        const lotCost = deductAmount * (lot.unit_cost || 0);

        totalCost += lotCost;
        if (lot.is_reimbursable) {
          reimbursableAmount += deductAmount;
        } else {
          nonReimbursableAmount += deductAmount;
        }

        updates.push({
          lotId: lot.id,
          newQuantity: lot.quantity_remaining - deductAmount
        });

        remaining -= deductAmount;
      }

      if (remaining > 0) {
        // Not enough inventory in lots, but proceed anyway (will just update quantity_on_hand)
        console.warn(`Not enough inventory in lots for item ${menuItemId}. Short by ${remaining}`);
      }

      // Apply updates
      let updateCount = 0;
      if (updates.length === 0) {
        return callback(null, {
          totalCost,
          avgCost: quantity > 0 ? totalCost / (quantity - remaining) : 0,
          reimbursable: reimbursableAmount > nonReimbursableAmount
        });
      }

      updates.forEach(update => {
        db.run(
          'UPDATE inventory_lots SET quantity_remaining = ? WHERE id = ?',
          [update.newQuantity, update.lotId],
          (updateErr) => {
            updateCount++;
            if (updateCount === updates.length) {
              callback(null, {
                totalCost,
                avgCost: quantity > 0 ? totalCost / (quantity - remaining) : 0,
                reimbursable: reimbursableAmount > nonReimbursableAmount
              });
            }
          }
        );
      });
    }
  );
}

// Export the deductFromLots function for use in orders
module.exports = router;
module.exports.deductFromLots = deductFromLots;
