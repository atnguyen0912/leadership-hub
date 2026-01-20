/**
 * Database Configuration and Initialization
 * 
 * This module sets up the SQLite database and creates all necessary tables.
 * It now uses a proper migration system instead of running ALTER TABLE commands
 * on every startup, which was causing errors and inefficiency.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file location - stores data persistently
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/leadership-hub.db');

let db = null;

/**
 * Get the database connection
 * This is used throughout the application to interact with the database
 */
const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initialize() first.');
  }
  return db;
};

/**
 * Initialize sample menu data
 * This creates some default menu items if the database is empty
 */
const initializeSampleMenu = (database) => {
  // Create main menu categories
  database.run('INSERT INTO menu_items (name, price, parent_id, display_order, grid_row, grid_col) VALUES (?, ?, ?, ?, ?, ?)', ['Snacks', null, null, 1, 1, 1], function(err) {
    if (!err && this.lastID) {
      const snacksId = this.lastID;
      database.run('INSERT INTO menu_items (name, price, parent_id, display_order, grid_row, grid_col) VALUES (?, ?, ?, ?, ?, ?)', ['Chips', 1.50, snacksId, 1, -1, -1]);
      database.run('INSERT INTO menu_items (name, price, parent_id, display_order, grid_row, grid_col) VALUES (?, ?, ?, ?, ?, ?)', ['Candy Bar', 1.00, snacksId, 2, -1, -1]);
      database.run('INSERT INTO menu_items (name, price, parent_id, display_order, grid_row, grid_col) VALUES (?, ?, ?, ?, ?, ?)', ['Cookies', 1.25, snacksId, 3, -1, -1]);
    }
  });

  database.run('INSERT INTO menu_items (name, price, parent_id, display_order, grid_row, grid_col) VALUES (?, ?, ?, ?, ?, ?)', ['Drinks', null, null, 2, 1, 2], function(err) {
    if (!err && this.lastID) {
      const drinksId = this.lastID;
      database.run('INSERT INTO menu_items (name, price, parent_id, display_order, grid_row, grid_col) VALUES (?, ?, ?, ?, ?, ?)', ['Small', 1.50, drinksId, 1, -1, -1]);
      database.run('INSERT INTO menu_items (name, price, parent_id, display_order, grid_row, grid_col) VALUES (?, ?, ?, ?, ?, ?)', ['Medium', 2.00, drinksId, 2, -1, -1]);
      database.run('INSERT INTO menu_items (name, price, parent_id, display_order, grid_row, grid_col) VALUES (?, ?, ?, ?, ?, ?)', ['Large', 2.50, drinksId, 3, -1, -1]);
    }
  });
};

/**
 * Initialize the database
 * Creates all tables and runs migrations
 */
const initialize = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Create all base tables
      db.serialize(() => {
        // Students table
        db.run(`
          CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            is_lead INTEGER DEFAULT 0,
            lead_type TEXT DEFAULT NULL
          )
        `);

        // Hours table
        db.run(`
          CREATE TABLE IF NOT EXISTS hours (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            date TEXT NOT NULL,
            time_in TEXT NOT NULL,
            time_out TEXT NOT NULL,
            item TEXT DEFAULT '',
            hour_type TEXT DEFAULT 'other',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(student_id)
          )
        `);

        // Admin table
        db.run(`
          CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            password TEXT NOT NULL
          )
        `);

        // CashBox table (singleton - stores current totals)
        db.run(`
          CREATE TABLE IF NOT EXISTS cashbox (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            quarters INTEGER DEFAULT 0,
            bills_1 INTEGER DEFAULT 0,
            bills_5 INTEGER DEFAULT 0,
            bills_10 INTEGER DEFAULT 0,
            bills_20 INTEGER DEFAULT 0,
            bills_50 INTEGER DEFAULT 0,
            bills_100 INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Initialize cashbox with $0 if it doesn't exist
        db.run(`INSERT OR IGNORE INTO cashbox (id) VALUES (1)`);

        // CashBox Programs table
        db.run(`
          CREATE TABLE IF NOT EXISTS cashbox_programs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Concession Sessions table
        db.run(`
          CREATE TABLE IF NOT EXISTS concession_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            program_id INTEGER NOT NULL,
            status TEXT DEFAULT 'created' CHECK (status IN ('created', 'active', 'closed', 'cancelled')),
            is_test INTEGER DEFAULT 0,

            start_quarters INTEGER DEFAULT 0,
            start_bills_1 INTEGER DEFAULT 0,
            start_bills_5 INTEGER DEFAULT 0,
            start_bills_10 INTEGER DEFAULT 0,
            start_bills_20 INTEGER DEFAULT 0,
            start_bills_50 INTEGER DEFAULT 0,
            start_bills_100 INTEGER DEFAULT 0,
            start_total REAL DEFAULT 0,

            end_quarters INTEGER DEFAULT 0,
            end_bills_1 INTEGER DEFAULT 0,
            end_bills_5 INTEGER DEFAULT 0,
            end_bills_10 INTEGER DEFAULT 0,
            end_bills_20 INTEGER DEFAULT 0,
            end_bills_50 INTEGER DEFAULT 0,
            end_bills_100 INTEGER DEFAULT 0,
            end_total REAL DEFAULT 0,

            profit REAL DEFAULT 0,

            created_by TEXT,
            started_by TEXT,
            closed_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            started_at DATETIME,
            closed_at DATETIME,

            FOREIGN KEY (program_id) REFERENCES cashbox_programs(id)
          )
        `);

        // Program Earnings table
        db.run(`
          CREATE TABLE IF NOT EXISTS program_earnings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            program_id INTEGER NOT NULL,
            session_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (program_id) REFERENCES cashbox_programs(id),
            FOREIGN KEY (session_id) REFERENCES concession_sessions(id)
          )
        `);

        // Menu Items table (hierarchical)
        db.run(`
          CREATE TABLE IF NOT EXISTS menu_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL,
            parent_id INTEGER DEFAULT NULL,
            display_order INTEGER DEFAULT 0,
            grid_row INTEGER DEFAULT 0,
            grid_col INTEGER DEFAULT 0,
            row_span INTEGER DEFAULT 1,
            col_span INTEGER DEFAULT 1,
            active INTEGER DEFAULT 1,
            unit_cost REAL DEFAULT 0,
            quantity_on_hand INTEGER DEFAULT 0,
            track_inventory INTEGER DEFAULT 1,
            is_composite INTEGER DEFAULT 0,
            is_supply INTEGER DEFAULT 0,
            default_purchase_quantity INTEGER DEFAULT NULL,
            fill_percentage INTEGER DEFAULT 100,
            is_liquid INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES menu_items(id)
          )
        `);

        // Orders table
        db.run(`
          CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            subtotal REAL NOT NULL,
            amount_tendered REAL NOT NULL,
            change_given REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES concession_sessions(id)
          )
        `);

        // Order Items table
        db.run(`
          CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            menu_item_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            line_total REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
          )
        `);

        // Events table (for bulk hours logging)
        db.run(`
          CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            default_time_in TEXT NOT NULL,
            default_time_out TEXT NOT NULL,
            check_in_code TEXT UNIQUE,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'cancelled')),
            created_by TEXT NOT NULL,
            approved_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            approved_at DATETIME,
            completed_at DATETIME,
            FOREIGN KEY (created_by) REFERENCES students(student_id)
          )
        `);

        // Event Attendees table
        db.run(`
          CREATE TABLE IF NOT EXISTS event_attendees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            student_id TEXT NOT NULL,
            checked_in INTEGER DEFAULT 0,
            checked_in_at DATETIME,
            hours_logged INTEGER DEFAULT 0,
            FOREIGN KEY (event_id) REFERENCES events(id),
            FOREIGN KEY (student_id) REFERENCES students(student_id),
            UNIQUE(event_id, student_id)
          )
        `);

        // =====================
        // PERMISSION SYSTEM
        // =====================

        // Permission groups table
        db.run(`
          CREATE TABLE IF NOT EXISTS permission_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Group permissions table
        db.run(`
          CREATE TABLE IF NOT EXISTS group_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            permission TEXT NOT NULL,
            FOREIGN KEY (group_id) REFERENCES permission_groups(id),
            UNIQUE(group_id, permission)
          )
        `);

        // Student groups table
        db.run(`
          CREATE TABLE IF NOT EXISTS student_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            group_id INTEGER NOT NULL,
            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (group_id) REFERENCES permission_groups(id),
            UNIQUE(student_id, group_id)
          )
        `);

        // =====================
        // INVENTORY & PURCHASES
        // =====================

        // Purchases table (receipt entry)
        db.run(`
          CREATE TABLE IF NOT EXISTS purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vendor TEXT,
            purchase_date TEXT NOT NULL,
            subtotal REAL NOT NULL,
            tax REAL DEFAULT 0,
            delivery_fee REAL DEFAULT 0,
            other_fees REAL DEFAULT 0,
            total REAL NOT NULL,
            notes TEXT,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Purchase items table (line items from receipt)
        db.run(`
          CREATE TABLE IF NOT EXISTS purchase_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            purchase_id INTEGER NOT NULL,
            menu_item_id INTEGER,
            item_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            line_total REAL NOT NULL,
            distributed_cost REAL,
            unit_cost REAL,
            crv_per_unit REAL DEFAULT 0,
            crv_total REAL DEFAULT 0,
            FOREIGN KEY (purchase_id) REFERENCES purchases(id)
          )
        `);

        // Purchase templates table (for quick-add bundles)
        db.run(`
          CREATE TABLE IF NOT EXISTS purchase_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Purchase template items table
        db.run(`
          CREATE TABLE IF NOT EXISTS purchase_template_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER NOT NULL,
            menu_item_id INTEGER,
            item_name TEXT NOT NULL,
            default_quantity INTEGER NOT NULL,
            FOREIGN KEY (template_id) REFERENCES purchase_templates(id)
          )
        `);

        // Menu item components (for composite items)
        db.run(`
          CREATE TABLE IF NOT EXISTS menu_item_components (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            composite_item_id INTEGER NOT NULL,
            component_item_id INTEGER NOT NULL,
            quantity_required REAL NOT NULL,
            FOREIGN KEY (composite_item_id) REFERENCES menu_items(id),
            FOREIGN KEY (component_item_id) REFERENCES menu_items(id)
          )
        `);

        // CashApp payments (tracked separately)
        db.run(`
          CREATE TABLE IF NOT EXISTS cashapp_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            session_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Zelle payments (auto-applied to reimbursement)
        db.run(`
          CREATE TABLE IF NOT EXISTS zelle_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            session_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // =====================
        // REIMBURSEMENT & LOSSES
        // =====================

        // Reimbursement ledger
        db.run(`
          CREATE TABLE IF NOT EXISTS reimbursement_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_type TEXT CHECK (entry_type IN ('cogs_owed', 'asb_loss', 'zelle_received', 'cashapp_withdrawal', 'cashbox_reimbursement')),
            amount REAL NOT NULL,
            session_id INTEGER,
            reference_id INTEGER,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Losses tracking
        db.run(`
          CREATE TABLE IF NOT EXISTS losses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            program_id INTEGER,
            loss_type TEXT CHECK (loss_type IN ('cash_discrepancy', 'inventory_discrepancy', 'spoilage', 'other')),
            amount REAL NOT NULL,
            description TEXT,
            recorded_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // =====================
        // PROFIT DISTRIBUTION
        // =====================

        // Program profit distributions
        db.run(`
          CREATE TABLE IF NOT EXISTS profit_distributions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            program_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            distributed_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES concession_sessions(id),
            FOREIGN KEY (program_id) REFERENCES cashbox_programs(id)
          )
        `);

        // Create indexes for better query performance
        db.run(`CREATE INDEX IF NOT EXISTS idx_hours_student_id ON hours(student_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_hours_date ON hours(date)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_concession_sessions_status ON concession_sessions(status)`);

        // Check if we need to initialize sample data
        db.get('SELECT COUNT(*) as count FROM menu_items', [], (err, row) => {
          if (!err && row.count === 0) {
            initializeSampleMenu(db);
          }
        });

        // Run migrations after tables are created
        // This is an async operation but we don't wait for it to avoid blocking
        // The migrations system will handle any errors gracefully
        const { runAllMigrations } = require('./database/migrations');
        runAllMigrations().catch(err => {
          console.error('Migration error:', err);
        });

        resolve();
      });
    });
  });
};

/**
 * Close the database connection
 * Used primarily in testing
 */
const close = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) reject(err);
        else {
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
};

module.exports = {
  initialize,
  getDb,
  close
};
