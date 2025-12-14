const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// Available permissions in the system
const AVAILABLE_PERMISSIONS = [
  { key: 'admin.*', label: 'Full Admin Access', category: 'Admin' },
  { key: 'sessions.create', label: 'Create Sessions', category: 'Concessions' },
  { key: 'sessions.start', label: 'Start Sessions', category: 'Concessions' },
  { key: 'sessions.run', label: 'Run POS Counter', category: 'Concessions' },
  { key: 'sessions.close', label: 'Close Sessions', category: 'Concessions' },
  { key: 'inventory.view', label: 'View Inventory', category: 'Inventory' },
  { key: 'inventory.count', label: 'Count Inventory', category: 'Inventory' },
  { key: 'inventory.adjust', label: 'Adjust Inventory', category: 'Inventory' },
  { key: 'purchases.enter', label: 'Enter Purchases', category: 'Inventory' },
  { key: 'purchases.stock_update', label: 'Stock Updates', category: 'Inventory' },
  { key: 'menu.edit', label: 'Edit Menu', category: 'Menu' },
  { key: 'cashbox.view', label: 'View Cashbox', category: 'Cashbox' },
  { key: 'cashbox.manage', label: 'Manage Cashbox', category: 'Cashbox' },
  { key: 'hours.approve', label: 'Approve Hours', category: 'Hours' },
  { key: 'hours.view_all', label: 'View All Hours', category: 'Hours' },
  { key: 'hours.log_own', label: 'Log Own Hours', category: 'Hours' },
  { key: 'reports.view', label: 'View Reports', category: 'Reports' },
  { key: 'reports.export', label: 'Export Data', category: 'Reports' }
];

// Get list of available permissions
router.get('/available', (req, res) => {
  res.json(AVAILABLE_PERMISSIONS);
});

// Get all permission groups
router.get('/groups', (req, res) => {
  const db = getDb();

  db.all(
    `SELECT pg.*, COUNT(sg.id) as member_count
     FROM permission_groups pg
     LEFT JOIN student_groups sg ON pg.id = sg.group_id
     GROUP BY pg.id
     ORDER BY pg.name`,
    [],
    (err, groups) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Get permissions for each group
      const groupIds = groups.map(g => g.id);
      if (groupIds.length === 0) {
        return res.json([]);
      }

      db.all(
        `SELECT group_id, permission FROM group_permissions WHERE group_id IN (${groupIds.join(',')})`,
        [],
        (err, perms) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Attach permissions to groups
          const permsByGroup = {};
          perms.forEach(p => {
            if (!permsByGroup[p.group_id]) {
              permsByGroup[p.group_id] = [];
            }
            permsByGroup[p.group_id].push(p.permission);
          });

          groups.forEach(g => {
            g.permissions = permsByGroup[g.id] || [];
          });

          res.json(groups);
        }
      );
    }
  );
});

// Get single permission group with members
router.get('/groups/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  db.get('SELECT * FROM permission_groups WHERE id = ?', [id], (err, group) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get permissions
    db.all(
      'SELECT permission FROM group_permissions WHERE group_id = ?',
      [id],
      (err, perms) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        group.permissions = perms.map(p => p.permission);

        // Get members
        db.all(
          `SELECT s.student_id, s.name, sg.assigned_at
           FROM student_groups sg
           JOIN students s ON sg.student_id = s.student_id
           WHERE sg.group_id = ?
           ORDER BY s.name`,
          [id],
          (err, members) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            group.members = members;
            res.json(group);
          }
        );
      }
    );
  });
});

// Create permission group
router.post('/groups', (req, res) => {
  const db = getDb();
  const { name, description, permissions } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  db.run(
    'INSERT INTO permission_groups (name, description) VALUES (?, ?)',
    [name, description || ''],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Group name already exists' });
        }
        return res.status(500).json({ error: err.message });
      }

      const groupId = this.lastID;

      // Add permissions
      if (permissions && permissions.length > 0) {
        const stmt = db.prepare('INSERT INTO group_permissions (group_id, permission) VALUES (?, ?)');
        permissions.forEach(perm => {
          stmt.run(groupId, perm);
        });
        stmt.finalize();
      }

      res.status(201).json({
        id: groupId,
        name,
        description,
        permissions: permissions || []
      });
    }
  );
});

// Update permission group
router.put('/groups/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { name, description, permissions } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  db.run(
    'UPDATE permission_groups SET name = ?, description = ? WHERE id = ?',
    [name, description || '', id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Update permissions - delete and re-add
      db.run('DELETE FROM group_permissions WHERE group_id = ?', [id], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (permissions && permissions.length > 0) {
          const stmt = db.prepare('INSERT INTO group_permissions (group_id, permission) VALUES (?, ?)');
          permissions.forEach(perm => {
            stmt.run(id, perm);
          });
          stmt.finalize();
        }

        res.json({ id: parseInt(id), name, description, permissions: permissions || [] });
      });
    }
  );
});

// Delete permission group
router.delete('/groups/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  // Check if it's a default group (Admin, Member, etc.)
  db.get('SELECT name FROM permission_groups WHERE id = ?', [id], (err, group) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const protectedGroups = ['Admin', 'Member'];
    if (protectedGroups.includes(group.name)) {
      return res.status(400).json({ error: 'Cannot delete protected group' });
    }

    // Delete group permissions first
    db.run('DELETE FROM group_permissions WHERE group_id = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Remove all members from group
      db.run('DELETE FROM student_groups WHERE group_id = ?', [id], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Delete the group
        db.run('DELETE FROM permission_groups WHERE id = ?', [id], (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ success: true });
        });
      });
    });
  });
});

// Get group members
router.get('/groups/:id/members', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  db.all(
    `SELECT s.student_id, s.name, sg.assigned_at
     FROM student_groups sg
     JOIN students s ON sg.student_id = s.student_id
     WHERE sg.group_id = ?
     ORDER BY s.name`,
    [id],
    (err, members) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(members);
    }
  );
});

// Bulk add members to group
router.post('/groups/:id/members', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { studentIds } = req.body;

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'Student IDs array is required' });
  }

  const stmt = db.prepare('INSERT OR IGNORE INTO student_groups (student_id, group_id) VALUES (?, ?)');
  let added = 0;

  studentIds.forEach(studentId => {
    stmt.run(studentId, id, function(err) {
      if (!err && this.changes > 0) {
        added++;
      }
    });
  });

  stmt.finalize((err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, added });
  });
});

// Remove member from group
router.delete('/groups/:id/members/:studentId', (req, res) => {
  const db = getDb();
  const { id, studentId } = req.params;

  db.run(
    'DELETE FROM student_groups WHERE group_id = ? AND student_id = ?',
    [id, studentId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, removed: this.changes > 0 });
    }
  );
});

// Get student's permissions
router.get('/student/:studentId', (req, res) => {
  const db = getDb();
  const { studentId } = req.params;

  db.all(
    `SELECT DISTINCT gp.permission
     FROM student_groups sg
     JOIN group_permissions gp ON sg.group_id = gp.group_id
     WHERE sg.student_id = ?`,
    [studentId],
    (err, perms) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const permissions = perms.map(p => p.permission);

      // Check if user has admin access
      const isAdmin = permissions.includes('admin.*');

      res.json({
        studentId,
        permissions,
        isAdmin
      });
    }
  );
});

// Get student's groups
router.get('/student/:studentId/groups', (req, res) => {
  const db = getDb();
  const { studentId } = req.params;

  db.all(
    `SELECT pg.*
     FROM student_groups sg
     JOIN permission_groups pg ON sg.group_id = pg.id
     WHERE sg.student_id = ?
     ORDER BY pg.name`,
    [studentId],
    (err, groups) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(groups);
    }
  );
});

// Helper function to check if student has permission (for use in other routes)
const hasPermission = (studentId, permission) => {
  return new Promise((resolve, reject) => {
    const db = getDb();

    db.all(
      `SELECT DISTINCT gp.permission
       FROM student_groups sg
       JOIN group_permissions gp ON sg.group_id = gp.group_id
       WHERE sg.student_id = ?`,
      [studentId],
      (err, perms) => {
        if (err) {
          return reject(err);
        }

        const permissions = perms.map(p => p.permission);

        // Admin has all permissions
        if (permissions.includes('admin.*')) {
          return resolve(true);
        }

        // Check exact permission
        if (permissions.includes(permission)) {
          return resolve(true);
        }

        // Check wildcard (e.g., 'sessions.*' matches 'sessions.create')
        const parts = permission.split('.');
        if (parts.length > 1) {
          const wildcardPerm = parts[0] + '.*';
          if (permissions.includes(wildcardPerm)) {
            return resolve(true);
          }
        }

        resolve(false);
      }
    );
  });
};

module.exports = router;
module.exports.hasPermission = hasPermission;
