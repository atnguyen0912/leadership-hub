const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
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
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/hours', hoursRoutes);
app.use('/api/cashbox', cashboxRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/cashapp', cashappRoutes);
app.use('/api/losses', lossesRoutes);
app.use('/api/reports', reportsRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Initialize database and start server
db.initialize().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
