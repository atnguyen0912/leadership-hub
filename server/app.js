const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { authenticateToken, requireAdmin } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students');
const hoursRoutes = require('./routes/hours');
const cashboxRoutes = require('./routes/cashbox');
const menuRoutes = require('./routes/menu');
const ordersRoutes = require('./routes/orders');
const eventsRoutes = require('./routes/events');
const permissionsRoutes = require('./routes/permissions');
const purchasesRoutes = require('./routes/purchases');
const inventoryRoutes = require('./routes/inventory');
const cashappRoutes = require('./routes/cashapp');
const lossesRoutes = require('./routes/losses');
const reportsRoutes = require('./routes/reports');

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5000', 'https://leadership-hub.fly.dev', 'https://hawkinsasb.com', 'https://www.hawkinsasb.com'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Case-insensitive origin check
    const originLower = origin.toLowerCase();
    const isAllowed = allowedOrigins.some(allowed => allowed.toLowerCase() === originLower);
    console.log('CORS check - Origin:', origin, 'Allowed:', isAllowed);
    if (isAllowed) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

// Public routes (no auth required)
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/students', authenticateToken, studentsRoutes);
app.use('/api/hours', authenticateToken, hoursRoutes);
app.use('/api/menu', authenticateToken, menuRoutes);
app.use('/api/orders', authenticateToken, ordersRoutes);
app.use('/api/events', authenticateToken, eventsRoutes);

// Admin-only routes
app.use('/api/cashbox', authenticateToken, requireAdmin, cashboxRoutes);
app.use('/api/permissions', authenticateToken, requireAdmin, permissionsRoutes);
app.use('/api/purchases', authenticateToken, requireAdmin, purchasesRoutes);
app.use('/api/inventory', authenticateToken, requireAdmin, inventoryRoutes);
app.use('/api/cashapp', authenticateToken, requireAdmin, cashappRoutes);
app.use('/api/losses', authenticateToken, requireAdmin, lossesRoutes);
app.use('/api/reports', authenticateToken, requireAdmin, reportsRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

module.exports = app;
