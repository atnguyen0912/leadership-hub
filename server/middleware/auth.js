const jwt = require('jsonwebtoken');
const { JWT } = require('../config/constants');

const JWT_SECRET = process.env[JWT.SECRET_ENV] || JWT.DEFAULT_SECRET;
const JWT_EXPIRES_IN = JWT.EXPIRES_IN;

// Generate JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify token (for testing and manual verification)
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Verify JWT token middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
}

// Require admin role
function requireAdmin(req, res, next) {
  if (!req.user || req.user.type !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Require student or admin
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Require lead or admin
function requireLeadOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.type !== 'admin' && !req.user.isLead) {
    return res.status(403).json({ error: 'Lead or admin access required' });
  }
  next();
}

// Permission-based middleware factory
// Usage: requirePermission('sessions.run') or requirePermission(['sessions.run', 'sessions.create'])
function requirePermission(...permissions) {
  // Flatten in case array is passed
  const requiredPerms = permissions.flat();

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admins have all permissions
    if (req.user.type === 'admin') {
      return next();
    }

    // For students, check their permissions from groups
    const { getDb } = require('../database');
    const db = getDb();

    try {
      const studentPerms = await new Promise((resolve, reject) => {
        db.all(
          `SELECT DISTINCT gp.permission
           FROM student_groups sg
           JOIN group_permissions gp ON sg.group_id = gp.group_id
           WHERE sg.student_id = ?`,
          [req.user.studentId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows ? rows.map(r => r.permission) : []);
          }
        );
      });

      // Check if user has admin.* permission
      if (studentPerms.includes('admin.*')) {
        return next();
      }

      // Check if user has ANY of the required permissions
      const hasPermission = requiredPerms.some(reqPerm => {
        // Exact match
        if (studentPerms.includes(reqPerm)) return true;

        // Wildcard match (e.g., user has 'sessions.*', checking 'sessions.run')
        const parts = reqPerm.split('.');
        if (parts.length > 1) {
          const wildcardPerm = parts[0] + '.*';
          if (studentPerms.includes(wildcardPerm)) return true;
        }

        return false;
      });

      if (hasPermission) {
        // Attach permissions to request for route handlers to use
        req.userPermissions = studentPerms;
        return next();
      }

      return res.status(403).json({
        error: 'Permission denied',
        required: requiredPerms,
        message: `You need one of these permissions: ${requiredPerms.join(', ')}`
      });
    } catch (err) {
      console.error('Permission check error:', err);
      return res.status(500).json({ error: 'Error checking permissions' });
    }
  };
}

// Middleware that allows access but attaches permissions (for optional permission checks in routes)
function attachPermissions(req, res, next) {
  if (!req.user || req.user.type === 'admin') {
    req.userPermissions = ['admin.*'];
    return next();
  }

  const { getDb } = require('../database');
  const db = getDb();

  db.all(
    `SELECT DISTINCT gp.permission
     FROM student_groups sg
     JOIN group_permissions gp ON sg.group_id = gp.group_id
     WHERE sg.student_id = ?`,
    [req.user.studentId],
    (err, rows) => {
      req.userPermissions = err ? [] : (rows ? rows.map(r => r.permission) : []);
      next();
    }
  );
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  requireAdmin,
  requireAuth,
  requireLeadOrAdmin,
  requirePermission,
  attachPermissions,
  JWT_SECRET
};
