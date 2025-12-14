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

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  requireAdmin,
  requireAuth,
  requireLeadOrAdmin,
  JWT_SECRET
};
