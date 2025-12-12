const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');

const MENU_CSV_PATH = path.join(__dirname, '..', 'menu-items.csv');

// GET /api/menu - Get all menu items (hierarchical)
router.get('/', (req, res) => {
  const db = getDb();
  db.all(
    'SELECT * FROM menu_items WHERE active = 1 ORDER BY display_order, name',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Build hierarchical structure
      const topLevel = rows.filter(item => item.parent_id === null);
      const subItems = rows.filter(item => item.parent_id !== null);

      const menuItems = topLevel.map(item => ({
        ...item,
        hasSubMenu: item.price === null,
        subItems: subItems.filter(sub => sub.parent_id === item.id)
      }));

      res.json(menuItems);
    }
  );
});

// GET /api/menu/all - Get all menu items including inactive (Admin)
router.get('/all', (req, res) => {
  const db = getDb();
  db.all(
    'SELECT * FROM menu_items ORDER BY display_order, name',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const topLevel = rows.filter(item => item.parent_id === null);
      const subItems = rows.filter(item => item.parent_id !== null);

      const menuItems = topLevel.map(item => ({
        ...item,
        hasSubMenu: item.price === null,
        subItems: subItems.filter(sub => sub.parent_id === item.id)
      }));

      res.json(menuItems);
    }
  );
});

// POST /api/menu - Create a new menu item (Admin)
router.post('/', (req, res) => {
  const { name, price, parentId, displayOrder } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Item name is required' });
  }

  // If no parentId and no price, it's a category with sub-menu
  // If parentId provided, price is required
  if (parentId && (price === undefined || price === null)) {
    return res.status(400).json({ error: 'Price is required for sub-items' });
  }

  const db = getDb();

  // If parentId provided, verify parent exists and has no price (is a category)
  if (parentId) {
    db.get('SELECT * FROM menu_items WHERE id = ?', [parentId], (err, parent) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!parent) {
        return res.status(400).json({ error: 'Parent item not found' });
      }
      if (parent.price !== null) {
        return res.status(400).json({ error: 'Cannot add sub-item to an item with a price' });
      }

      insertMenuItem();
    });
  } else {
    insertMenuItem();
  }

  function insertMenuItem() {
    db.run(
      'INSERT INTO menu_items (name, price, parent_id, display_order) VALUES (?, ?, ?, ?)',
      [name.trim(), price || null, parentId || null, displayOrder || 0],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, id: this.lastID });
      }
    );
  }
});

// POST /api/menu/:id/set-parent - Move an item to a new parent (make it a sub-item)
router.post('/:id/set-parent', (req, res) => {
  const { id } = req.params;
  const { parentId } = req.body;

  const db = getDb();

  // First get the item being moved
  db.get('SELECT * FROM menu_items WHERE id = ?', [id], (err, item) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // If setting to top-level (no parent)
    if (!parentId) {
      db.run(
        'UPDATE menu_items SET parent_id = NULL, grid_row = -1, grid_col = -1 WHERE id = ?',
        [id],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ success: true, message: 'Item moved to top level' });
        }
      );
      return;
    }

    // Verify parent exists and is a category (has no price)
    db.get('SELECT * FROM menu_items WHERE id = ?', [parentId], (err, parent) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!parent) {
        return res.status(400).json({ error: 'Parent item not found' });
      }
      if (parent.price !== null) {
        return res.status(400).json({ error: 'Cannot add sub-item to an item with a price. Target must be a category.' });
      }

      // Prevent circular reference
      if (parent.parent_id === parseInt(id)) {
        return res.status(400).json({ error: 'Cannot create circular reference' });
      }

      // Move item to new parent, reset grid position
      db.run(
        'UPDATE menu_items SET parent_id = ?, grid_row = -1, grid_col = -1 WHERE id = ?',
        [parentId, id],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ success: true, message: `Item moved under ${parent.name}` });
        }
      );
    });
  });
});

// PUT /api/menu/:id - Update a menu item (Admin)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, price, displayOrder, active } = req.body;

  const db = getDb();

  // First get the current item
  db.get('SELECT * FROM menu_items WHERE id = ?', [id], (err, item) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(price);
    }
    if (displayOrder !== undefined) {
      updates.push('display_order = ?');
      params.push(displayOrder);
    }
    if (active !== undefined) {
      updates.push('active = ?');
      params.push(active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    db.run(
      `UPDATE menu_items SET ${updates.join(', ')} WHERE id = ?`,
      params,
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
      }
    );
  });
});

// DELETE /api/menu/:id - Deactivate a menu item (Admin)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  // Also deactivate any sub-items
  db.run(
    'UPDATE menu_items SET active = 0 WHERE id = ? OR parent_id = ?',
    [id, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Menu item not found' });
      }
      res.json({ success: true });
    }
  );
});

// DELETE /api/menu/:id/permanent - Permanently delete a menu item (Admin)
router.delete('/:id/permanent', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  // Check if item has been used in any orders
  db.get(
    'SELECT COUNT(*) as count FROM order_items WHERE menu_item_id = ?',
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (row.count > 0) {
        return res.status(400).json({
          error: 'Cannot delete item that has been used in orders. Deactivate it instead.'
        });
      }

      // Check for sub-items used in orders
      db.get(
        'SELECT COUNT(*) as count FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE mi.parent_id = ?',
        [id],
        (err, subRow) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          if (subRow.count > 0) {
            return res.status(400).json({
              error: 'Cannot delete item with sub-items that have been used in orders. Deactivate it instead.'
            });
          }

          // Delete sub-items first, then the item
          db.run('DELETE FROM menu_items WHERE parent_id = ?', [id], (err) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            db.run('DELETE FROM menu_items WHERE id = ?', [id], function (err) {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }
              if (this.changes === 0) {
                return res.status(404).json({ error: 'Menu item not found' });
              }
              res.json({ success: true, message: 'Item permanently deleted' });
            });
          });
        }
      );
    }
  );
});

// POST /api/menu/:id/reactivate - Reactivate a menu item (Admin)
router.post('/:id/reactivate', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  // Reactivate item and its sub-items
  db.run(
    'UPDATE menu_items SET active = 1 WHERE id = ? OR parent_id = ?',
    [id, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Menu item not found' });
      }
      res.json({ success: true });
    }
  );
});

// POST /api/menu/reorder - Batch update display order for menu items
router.post('/reorder', (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  const db = getDb();

  // Use serialize to ensure all updates happen in order
  db.serialize(() => {
    const stmt = db.prepare('UPDATE menu_items SET display_order = ? WHERE id = ?');

    items.forEach((item, index) => {
      stmt.run(index, item.id);
    });

    stmt.finalize((err) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true });
    });
  });
});

// POST /api/menu/reorder-subitems - Batch update display order for sub-items
router.post('/reorder-subitems', (req, res) => {
  const { parentId, items } = req.body;

  console.log('reorder-subitems called:', { parentId, itemCount: items?.length });

  if (!parentId || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Parent ID and items array are required' });
  }

  const db = getDb();

  db.serialize(() => {
    const stmt = db.prepare('UPDATE menu_items SET display_order = ? WHERE id = ? AND parent_id = ?');

    items.forEach((item, index) => {
      console.log(`Updating item ${item.id} to display_order ${index} for parent ${parentId}`);
      stmt.run(index, item.id, parentId, function(err) {
        if (err) {
          console.error('Error updating item:', err);
        } else {
          console.log(`Updated item ${item.id}, changes: ${this.changes}`);
        }
      });
    });

    stmt.finalize((err) => {
      if (err) {
        console.error('Finalize error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true });
    });
  });
});

// POST /api/menu/:id/position - Update grid position for a menu item
router.post('/:id/position', (req, res) => {
  const { id } = req.params;
  const { gridRow, gridCol } = req.body;

  if (gridRow === undefined || gridCol === undefined) {
    return res.status(400).json({ error: 'Grid row and column are required' });
  }

  const db = getDb();

  db.run(
    'UPDATE menu_items SET grid_row = ?, grid_col = ? WHERE id = ?',
    [gridRow, gridCol, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Menu item not found' });
      }
      res.json({ success: true });
    }
  );
});

// POST /api/menu/grid-positions - Batch update grid positions for menu items
router.post('/grid-positions', (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  const db = getDb();

  db.serialize(() => {
    const stmt = db.prepare('UPDATE menu_items SET grid_row = ?, grid_col = ? WHERE id = ?');

    items.forEach((item) => {
      stmt.run(item.gridRow, item.gridCol, item.id);
    });

    stmt.finalize((err) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true });
    });
  });
});

// POST /api/menu/:id/span - Update item span (Admin)
router.post('/:id/span', (req, res) => {
  const { id } = req.params;
  const { rowSpan, colSpan } = req.body;

  if (rowSpan === undefined && colSpan === undefined) {
    return res.status(400).json({ error: 'rowSpan or colSpan is required' });
  }

  const db = getDb();

  const updates = [];
  const values = [];

  if (rowSpan !== undefined) {
    updates.push('row_span = ?');
    values.push(Math.max(1, Math.min(3, parseInt(rowSpan) || 1)));
  }
  if (colSpan !== undefined) {
    updates.push('col_span = ?');
    values.push(Math.max(1, Math.min(4, parseInt(colSpan) || 1)));
  }
  values.push(id);

  db.run(
    `UPDATE menu_items SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }
      res.json({ success: true });
    }
  );
});

// POST /api/menu/save-to-csv - Export current menu items to CSV file (Admin)
router.post('/save-to-csv', (req, res) => {
  const db = getDb();

  db.all(
    'SELECT * FROM menu_items WHERE active = 1 ORDER BY display_order, name',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Build parent name lookup
      const idToName = {};
      rows.forEach(row => {
        idToName[row.id] = row.name;
      });

      // Build CSV content
      const csvLines = ['name,price,parent,grid_row,grid_col,row_span,col_span'];

      rows.forEach(row => {
        const name = row.name;
        const price = row.price !== null ? row.price.toFixed(2) : '';
        const parent = row.parent_id ? idToName[row.parent_id] || '' : '';
        const gridRow = row.grid_row !== null ? row.grid_row : -1;
        const gridCol = row.grid_col !== null ? row.grid_col : -1;
        const rowSpan = row.row_span !== null ? row.row_span : 1;
        const colSpan = row.col_span !== null ? row.col_span : 1;

        // Escape name if it contains commas
        const escapedName = name.includes(',') ? `"${name}"` : name;

        csvLines.push(`${escapedName},${price},${parent},${gridRow},${gridCol},${rowSpan},${colSpan}`);
      });

      const csvContent = csvLines.join('\n');

      try {
        fs.writeFileSync(MENU_CSV_PATH, csvContent, 'utf-8');
        res.json({
          success: true,
          message: `Saved ${rows.length} menu items to CSV`,
          itemCount: rows.length
        });
      } catch (writeErr) {
        console.error('Error writing CSV:', writeErr);
        res.status(500).json({ error: 'Failed to write CSV file' });
      }
    }
  );
});

// GET /api/menu/csv - Download current menu as CSV (Admin)
router.get('/csv', (req, res) => {
  const db = getDb();

  db.all(
    'SELECT * FROM menu_items WHERE active = 1 ORDER BY display_order, name',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Build parent name lookup
      const idToName = {};
      rows.forEach(row => {
        idToName[row.id] = row.name;
      });

      // Build CSV content
      const csvLines = ['name,price,parent,grid_row,grid_col,row_span,col_span'];

      rows.forEach(row => {
        const name = row.name;
        const price = row.price !== null ? row.price.toFixed(2) : '';
        const parent = row.parent_id ? idToName[row.parent_id] || '' : '';
        const gridRow = row.grid_row !== null ? row.grid_row : -1;
        const gridCol = row.grid_col !== null ? row.grid_col : -1;
        const rowSpan = row.row_span !== null ? row.row_span : 1;
        const colSpan = row.col_span !== null ? row.col_span : 1;

        const escapedName = name.includes(',') ? `"${name}"` : name;
        csvLines.push(`${escapedName},${price},${parent},${gridRow},${gridCol},${rowSpan},${colSpan}`);
      });

      const csvContent = csvLines.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="menu-items.csv"');
      res.send(csvContent);
    }
  );
});

// POST /api/menu/reset-from-csv - Clear menu and reload from CSV file (Admin)
router.post('/reset-from-csv', (req, res) => {
  const db = getDb();

  // Check if any orders exist
  db.get('SELECT COUNT(*) as count FROM order_items', [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (row.count > 0) {
      return res.status(400).json({
        error: 'Cannot reset menu - orders exist. This would break order history.'
      });
    }

    // Delete all menu items and reload from CSV
    db.run('DELETE FROM menu_items', [], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to clear menu items' });
      }

      // Load from CSV
      try {
        if (!fs.existsSync(MENU_CSV_PATH)) {
          return res.status(400).json({ error: 'No menu-items.csv file found' });
        }

        const { parse } = require('csv-parse/sync');
        const csvContent = fs.readFileSync(MENU_CSV_PATH, 'utf-8');
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        if (records.length === 0) {
          return res.status(400).json({ error: 'CSV file is empty' });
        }

        // Insert items (simplified - top level first)
        const parentMap = {};
        let displayOrder = 0;
        let inserted = 0;

        const topLevelItems = records.filter(r => !r.parent || r.parent.trim() === '');
        const childItems = records.filter(r => r.parent && r.parent.trim() !== '');

        // Insert top-level items synchronously using serialize
        db.serialize(() => {
          topLevelItems.forEach((record) => {
            displayOrder++;
            const price = record.price && record.price.trim() !== '' ? parseFloat(record.price) : null;
            const gridRow = record.grid_row && record.grid_row.trim() !== '' ? parseInt(record.grid_row) : -1;
            const gridCol = record.grid_col && record.grid_col.trim() !== '' ? parseInt(record.grid_col) : -1;
            const rowSpan = record.row_span && record.row_span.trim() !== '' ? parseInt(record.row_span) : 1;
            const colSpan = record.col_span && record.col_span.trim() !== '' ? parseInt(record.col_span) : 1;

            db.run(
              'INSERT INTO menu_items (name, price, display_order, grid_row, grid_col, row_span, col_span) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [record.name, price, displayOrder, gridRow, gridCol, rowSpan, colSpan],
              function(err) {
                if (!err && this.lastID) {
                  parentMap[record.name] = this.lastID;
                  inserted++;
                }
              }
            );
          });

          // After top-level items, insert children
          setTimeout(() => {
            let childOrder = 0;
            childItems.forEach((record) => {
              childOrder++;
              const parentId = parentMap[record.parent];
              if (!parentId) return;

              const price = record.price && record.price.trim() !== '' ? parseFloat(record.price) : null;
              const gridRow = record.grid_row && record.grid_row.trim() !== '' ? parseInt(record.grid_row) : -1;
              const gridCol = record.grid_col && record.grid_col.trim() !== '' ? parseInt(record.grid_col) : -1;
              const rowSpan = record.row_span && record.row_span.trim() !== '' ? parseInt(record.row_span) : 1;
              const colSpan = record.col_span && record.col_span.trim() !== '' ? parseInt(record.col_span) : 1;

              db.run(
                'INSERT INTO menu_items (name, price, parent_id, display_order, grid_row, grid_col, row_span, col_span) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [record.name, price, parentId, childOrder, gridRow, gridCol, rowSpan, colSpan],
                function(err) {
                  if (!err) inserted++;
                }
              );
            });

            setTimeout(() => {
              res.json({
                success: true,
                message: `Loaded ${records.length} menu items from CSV`,
                itemCount: records.length
              });
            }, 100);
          }, 100);
        });

      } catch (loadErr) {
        console.error('Error loading CSV:', loadErr);
        res.status(500).json({ error: 'Failed to load CSV file' });
      }
    });
  });
});

module.exports = router;
