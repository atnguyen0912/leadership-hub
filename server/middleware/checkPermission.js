const { getDb } = require('../database');

/**
 * Middleware to check if the current user has a specific permission
 * Usage: checkPermission('sessions.create')
 *
 * Expects req.headers['x-student-id'] to contain the student ID
 */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    const studentId = req.headers['x-student-id'];

    if (!studentId) {
      return res.status(401).json({ error: 'Student ID required' });
    }

    try {
      const hasAccess = await hasPermissionAsync(studentId, requiredPermission);

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Permission denied',
          required: requiredPermission
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 * Usage: checkAnyPermission(['sessions.create', 'sessions.start'])
 */
const checkAnyPermission = (requiredPermissions) => {
  return async (req, res, next) => {
    const studentId = req.headers['x-student-id'];

    if (!studentId) {
      return res.status(401).json({ error: 'Student ID required' });
    }

    try {
      for (const perm of requiredPermissions) {
        const hasAccess = await hasPermissionAsync(studentId, perm);
        if (hasAccess) {
          return next();
        }
      }

      return res.status(403).json({
        error: 'Permission denied',
        required: requiredPermissions
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };
};

/**
 * Async helper to check if student has permission
 */
const hasPermissionAsync = (studentId, permission) => {
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

/**
 * Get all permissions for a student
 */
const getStudentPermissions = (studentId) => {
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
        const isAdmin = permissions.includes('admin.*');

        resolve({ permissions, isAdmin });
      }
    );
  });
};

module.exports = {
  checkPermission,
  checkAnyPermission,
  hasPermissionAsync,
  getStudentPermissions
};
