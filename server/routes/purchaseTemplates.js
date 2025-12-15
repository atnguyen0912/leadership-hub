const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// Get all purchase templates
router.get('/', (req, res) => {
  const db = getDb();

  db.all(
    `SELECT pt.*,
     (SELECT COUNT(*) FROM purchase_template_items WHERE template_id = pt.id) as item_count
     FROM purchase_templates pt
     ORDER BY pt.name`,
    [],
    (err, templates) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(templates);
    }
  );
});

// Get single template with items
router.get('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  db.get('SELECT * FROM purchase_templates WHERE id = ?', [id], (err, template) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    db.all(
      `SELECT pti.*, m.name as menu_item_name
       FROM purchase_template_items pti
       LEFT JOIN menu_items m ON pti.menu_item_id = m.id
       WHERE pti.template_id = ?
       ORDER BY pti.id`,
      [id],
      (err, items) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        template.items = items;
        res.json(template);
      }
    );
  });
});

// Get template items only (for quick-add expansion)
router.get('/:id/items', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  db.all(
    `SELECT pti.*, m.name as menu_item_name, m.default_purchase_quantity
     FROM purchase_template_items pti
     LEFT JOIN menu_items m ON pti.menu_item_id = m.id
     WHERE pti.template_id = ?
     ORDER BY pti.id`,
    [id],
    (err, items) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(items);
    }
  );
});

// Create new template
router.post('/', (req, res) => {
  const db = getDb();
  const { name, items } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Template name is required' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }

  db.run(
    'INSERT INTO purchase_templates (name) VALUES (?)',
    [name.trim()],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(400).json({ error: 'A template with this name already exists' });
        }
        return res.status(500).json({ error: err.message });
      }

      const templateId = this.lastID;
      let itemsInserted = 0;

      items.forEach(item => {
        db.run(
          `INSERT INTO purchase_template_items (template_id, menu_item_id, item_name, default_quantity)
           VALUES (?, ?, ?, ?)`,
          [
            templateId,
            item.menuItemId || null,
            item.itemName || item.name || 'Unknown Item',
            item.defaultQuantity || item.quantity || 1
          ],
          (itemErr) => {
            itemsInserted++;
            if (itemsInserted === items.length) {
              res.status(201).json({
                id: templateId,
                name: name.trim(),
                item_count: items.length
              });
            }
          }
        );
      });
    }
  );
});

// Update template
router.put('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { name, items } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Template name is required' });
  }

  // Update template name
  db.run(
    'UPDATE purchase_templates SET name = ? WHERE id = ?',
    [name.trim(), id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(400).json({ error: 'A template with this name already exists' });
        }
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // If items provided, replace all items
      if (items && Array.isArray(items)) {
        db.run('DELETE FROM purchase_template_items WHERE template_id = ?', [id], (delErr) => {
          if (delErr) {
            return res.status(500).json({ error: delErr.message });
          }

          if (items.length === 0) {
            return res.json({ id: parseInt(id), name: name.trim(), item_count: 0 });
          }

          let itemsInserted = 0;
          items.forEach(item => {
            db.run(
              `INSERT INTO purchase_template_items (template_id, menu_item_id, item_name, default_quantity)
               VALUES (?, ?, ?, ?)`,
              [
                id,
                item.menuItemId || null,
                item.itemName || item.name || 'Unknown Item',
                item.defaultQuantity || item.quantity || 1
              ],
              () => {
                itemsInserted++;
                if (itemsInserted === items.length) {
                  res.json({ id: parseInt(id), name: name.trim(), item_count: items.length });
                }
              }
            );
          });
        });
      } else {
        res.json({ id: parseInt(id), name: name.trim() });
      }
    }
  );
});

// Delete template
router.delete('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  // Delete template items first
  db.run('DELETE FROM purchase_template_items WHERE template_id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Delete template
    db.run('DELETE FROM purchase_templates WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json({ success: true });
    });
  });
});

module.exports = router;
