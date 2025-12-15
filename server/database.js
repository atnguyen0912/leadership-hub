const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

// Use /data directory for persistent storage on Fly.io, otherwise use local directory
const DATA_DIR = process.env.NODE_ENV === 'production' && fs.existsSync('/data')
  ? '/data'
  : __dirname;
const DB_PATH = path.join(DATA_DIR, 'leadership.db');
const MENU_CSV_PATH = path.join(__dirname, 'menu-items.csv');
const STUDENTS_CSV_PATH = path.join(__dirname, 'students.csv');

let db;

// Load menu items from CSV file
const loadMenuItemsFromCSV = (database) => {
  try {
    // Check if CSV file exists
    if (!fs.existsSync(MENU_CSV_PATH)) {
      console.log('No menu-items.csv found, using hardcoded defaults');
      loadDefaultMenuItems(database);
      return;
    }

    const csvContent = fs.readFileSync(MENU_CSV_PATH, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    if (records.length === 0) {
      console.log('Empty menu-items.csv, using hardcoded defaults');
      loadDefaultMenuItems(database);
      return;
    }

    console.log(`Loading ${records.length} menu items from CSV...`);

    // First pass: insert all top-level items (no parent)
    const parentMap = {}; // Maps parent name to ID
    let displayOrder = 0;

    const topLevelItems = records.filter(r => !r.parent || r.parent.trim() === '');
    const childItems = records.filter(r => r.parent && r.parent.trim() !== '');

    // Insert top-level items
    topLevelItems.forEach((record) => {
      displayOrder++;
      const price = record.price && record.price.trim() !== '' ? parseFloat(record.price) : null;
      const gridRow = record.grid_row && record.grid_row.trim() !== '' ? parseInt(record.grid_row) : -1;
      const gridCol = record.grid_col && record.grid_col.trim() !== '' ? parseInt(record.grid_col) : -1;
      const rowSpan = record.row_span && record.row_span.trim() !== '' ? parseInt(record.row_span) : 1;
      const colSpan = record.col_span && record.col_span.trim() !== '' ? parseInt(record.col_span) : 1;

      database.run(
        'INSERT INTO menu_items (name, price, display_order, grid_row, grid_col, row_span, col_span) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [record.name, price, displayOrder, gridRow, gridCol, rowSpan, colSpan],
        function(err) {
          if (!err && this.lastID) {
            parentMap[record.name] = this.lastID;

            // After all top-level items are inserted, insert children
            if (Object.keys(parentMap).length === topLevelItems.length) {
              insertChildItems(database, childItems, parentMap);
            }
          } else if (err) {
            console.error(`Error inserting menu item ${record.name}:`, err);
          }
        }
      );
    });

    // If no top-level items, just insert children (edge case)
    if (topLevelItems.length === 0 && childItems.length > 0) {
      console.warn('CSV has child items but no parents');
    }

  } catch (err) {
    console.error('Error loading menu from CSV:', err);
    loadDefaultMenuItems(database);
  }
};

// Insert child menu items after parents are created
const insertChildItems = (database, childItems, parentMap) => {
  let childOrder = 0;
  childItems.forEach((record) => {
    childOrder++;
    const parentId = parentMap[record.parent];
    if (!parentId) {
      console.warn(`Parent "${record.parent}" not found for item "${record.name}"`);
      return;
    }

    const price = record.price && record.price.trim() !== '' ? parseFloat(record.price) : null;
    const gridRow = record.grid_row && record.grid_row.trim() !== '' ? parseInt(record.grid_row) : -1;
    const gridCol = record.grid_col && record.grid_col.trim() !== '' ? parseInt(record.grid_col) : -1;
    const rowSpan = record.row_span && record.row_span.trim() !== '' ? parseInt(record.row_span) : 1;
    const colSpan = record.col_span && record.col_span.trim() !== '' ? parseInt(record.col_span) : 1;

    database.run(
      'INSERT INTO menu_items (name, price, parent_id, display_order, grid_row, grid_col, row_span, col_span) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [record.name, price, parentId, childOrder, gridRow, gridCol, rowSpan, colSpan],
      function(err) {
        if (err) {
          console.error(`Error inserting child menu item ${record.name}:`, err);
        }
      }
    );
  });
};

// Load students from CSV file
const loadStudentsFromCSV = (database) => {
  try {
    if (!fs.existsSync(STUDENTS_CSV_PATH)) {
      console.log('No students.csv found, using default student');
      database.run(
        'INSERT INTO students (student_id, name, is_lead, lead_type) VALUES (?, ?, ?, ?)',
        ['09121999X314', 'Alex Nguyen', 0, null]
      );
      return;
    }

    const csvContent = fs.readFileSync(STUDENTS_CSV_PATH, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    if (records.length === 0) {
      console.log('Empty students.csv, using default student');
      database.run(
        'INSERT INTO students (student_id, name, is_lead, lead_type) VALUES (?, ?, ?, ?)',
        ['09121999X314', 'Alex Nguyen', 0, null]
      );
      return;
    }

    console.log(`Loading ${records.length} students from CSV...`);

    records.forEach((record) => {
      const isLead = record.is_lead === '1' || record.is_lead === 'true' ? 1 : 0;
      const leadType = record.lead_type && record.lead_type.trim() !== '' ? record.lead_type.trim() : null;

      database.run(
        'INSERT INTO students (student_id, name, is_lead, lead_type) VALUES (?, ?, ?, ?)',
        [record.student_id, record.name, isLead, leadType],
        function(err) {
          if (err) {
            console.error(`Error inserting student ${record.name}:`, err);
          }
        }
      );
    });

    console.log('Students loaded from CSV successfully');
  } catch (err) {
    console.error('Error loading students from CSV:', err);
  }
};

// Fallback hardcoded menu items
const loadDefaultMenuItems = (database) => {
  database.run('INSERT INTO menu_items (name, price, display_order, grid_row, grid_col) VALUES (?, ?, ?, ?, ?)', ['Hot Dog', 3.00, 1, 0, 0]);
  database.run('INSERT INTO menu_items (name, price, display_order, grid_row, grid_col) VALUES (?, ?, ?, ?, ?)', ['Nachos', 4.00, 2, 0, 1]);
  database.run('INSERT INTO menu_items (name, price, display_order, grid_row, grid_col) VALUES (?, ?, ?, ?, ?)', ['Popcorn', 2.50, 3, 0, 2]);
  database.run('INSERT INTO menu_items (name, price, display_order, grid_row, grid_col) VALUES (?, ?, ?, ?, ?)', ['Candy', 2.00, 4, 0, 3]);
  database.run('INSERT INTO menu_items (name, price, display_order, grid_row, grid_col) VALUES (?, ?, ?, ?, ?)', ['Bottled Water', 1.00, 6, 1, 0]);

  database.run('INSERT INTO menu_items (name, price, display_order, grid_row, grid_col) VALUES (?, ?, ?, ?, ?)', ['Drinks', null, 5, 1, 1], function(err) {
    if (!err && this.lastID) {
      const drinksId = this.lastID;
      database.run('INSERT INTO menu_items (name, price, parent_id, display_order, grid_row, grid_col) VALUES (?, ?, ?, ?, ?, ?)', ['Small', 1.50, drinksId, 1, -1, -1]);
      database.run('INSERT INTO menu_items (name, price, parent_id, display_order, grid_row, grid_col) VALUES (?, ?, ?, ?, ?, ?)', ['Medium', 2.00, drinksId, 2, -1, -1]);
      database.run('INSERT INTO menu_items (name, price, parent_id, display_order, grid_row, grid_col) VALUES (?, ?, ?, ?, ?, ?)', ['Large', 2.50, drinksId, 3, -1, -1]);
    }
  });
};

const initialize = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Create tables
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

        // Add is_lead column if it doesn't exist (migration)
        db.run(`ALTER TABLE students ADD COLUMN is_lead INTEGER DEFAULT 0`, [], () => {});
        // Add lead_type column if it doesn't exist (migration) - values: 'events', 'concessions', or NULL
        db.run(`ALTER TABLE students ADD COLUMN lead_type TEXT DEFAULT NULL`, [], () => {});

        // Hours table
        db.run(`
          CREATE TABLE IF NOT EXISTS hours (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            date TEXT NOT NULL,
            time_in TEXT NOT NULL,
            time_out TEXT NOT NULL,
            item TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(student_id)
          )
        `);

        // Add item column if it doesn't exist (migration for existing DBs)
        db.run(`ALTER TABLE hours ADD COLUMN item TEXT DEFAULT ''`, [], () => {});

        // Add hour_type column for categorizing hours (migration)
        db.run(`ALTER TABLE hours ADD COLUMN hour_type TEXT DEFAULT 'other'`, [], () => {});

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

        // Migration: Add is_test column to existing concession_sessions tables
        db.run(`ALTER TABLE concession_sessions ADD COLUMN is_test INTEGER DEFAULT 0`, [], () => {});

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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES menu_items(id)
          )
        `);

        // Add grid columns if they don't exist (migration for existing DBs)
        db.run(`ALTER TABLE menu_items ADD COLUMN grid_row INTEGER DEFAULT 0`, [], () => {});
        db.run(`ALTER TABLE menu_items ADD COLUMN grid_col INTEGER DEFAULT 0`, [], () => {});
        db.run(`ALTER TABLE menu_items ADD COLUMN row_span INTEGER DEFAULT 1`, [], () => {});
        db.run(`ALTER TABLE menu_items ADD COLUMN col_span INTEGER DEFAULT 1`, [], () => {});

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

        // Add inventory columns to menu_items (migrations)
        db.run(`ALTER TABLE menu_items ADD COLUMN unit_cost REAL DEFAULT 0`, [], () => {});
        db.run(`ALTER TABLE menu_items ADD COLUMN quantity_on_hand INTEGER DEFAULT 0`, [], () => {});
        db.run(`ALTER TABLE menu_items ADD COLUMN track_inventory INTEGER DEFAULT 1`, [], () => {});
        db.run(`ALTER TABLE menu_items ADD COLUMN is_composite INTEGER DEFAULT 0`, [], () => {});
        db.run(`ALTER TABLE menu_items ADD COLUMN is_supply INTEGER DEFAULT 0`, [], () => {});
        db.run(`ALTER TABLE menu_items ADD COLUMN default_purchase_quantity INTEGER DEFAULT NULL`, [], () => {});

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
            FOREIGN KEY (purchase_id) REFERENCES purchases(id)
          )
        `);

        // Add CRV columns to purchase_items (migrations)
        db.run(`ALTER TABLE purchase_items ADD COLUMN crv_per_unit REAL DEFAULT 0`, [], () => {});
        db.run(`ALTER TABLE purchase_items ADD COLUMN crv_total REAL DEFAULT 0`, [], () => {});

        // Add liquid/fill tracking columns to menu_items
        db.run(`ALTER TABLE menu_items ADD COLUMN fill_percentage INTEGER DEFAULT 100`, [], () => {});
        db.run(`ALTER TABLE menu_items ADD COLUMN is_liquid INTEGER DEFAULT 0`, [], () => {});

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
            default_quantity INTEGER DEFAULT 1,
            FOREIGN KEY (template_id) REFERENCES purchase_templates(id),
            FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
          )
        `);

        // Inventory lots table (FIFO tracking)
        db.run(`
          CREATE TABLE IF NOT EXISTS inventory_lots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            menu_item_id INTEGER NOT NULL,
            purchase_item_id INTEGER,
            quantity_original INTEGER NOT NULL,
            quantity_remaining INTEGER NOT NULL,
            unit_cost REAL NOT NULL,
            is_reimbursable INTEGER DEFAULT 1,
            purchase_date TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
            FOREIGN KEY (purchase_item_id) REFERENCES purchase_items(id)
          )
        `);

        // Menu item components table (for composites like Hot Dog = Wiener + Bun)
        db.run(`
          CREATE TABLE IF NOT EXISTS menu_item_components (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            menu_item_id INTEGER NOT NULL,
            component_item_id INTEGER NOT NULL,
            quantity REAL DEFAULT 1,
            FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
            FOREIGN KEY (component_item_id) REFERENCES menu_items(id)
          )
        `);

        // Inventory transactions table (audit trail)
        db.run(`
          CREATE TABLE IF NOT EXISTS inventory_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            menu_item_id INTEGER NOT NULL,
            transaction_type TEXT CHECK (transaction_type IN ('sale', 'purchase', 'stock_update', 'lost', 'wasted', 'donated', 'count_adjustment')),
            quantity_change INTEGER NOT NULL,
            unit_cost_at_time REAL,
            is_reimbursable INTEGER DEFAULT 1,
            reference_id INTEGER,
            notes TEXT,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Inventory counts table
        db.run(`
          CREATE TABLE IF NOT EXISTS inventory_counts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            menu_item_id INTEGER NOT NULL,
            expected_quantity INTEGER NOT NULL,
            actual_quantity INTEGER NOT NULL,
            discrepancy INTEGER NOT NULL,
            cost_impact REAL,
            counted_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
          )
        `);

        // =====================
        // ORDERS & PAYMENTS
        // =====================

        // Add order columns (migrations)
        db.run(`ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0`, [], () => {});
        db.run(`ALTER TABLE orders ADD COLUMN discount_charged_to INTEGER`, [], () => {});
        db.run(`ALTER TABLE orders ADD COLUMN discount_reason TEXT`, [], () => {});
        db.run(`ALTER TABLE orders ADD COLUMN final_total REAL`, [], () => {});
        db.run(`ALTER TABLE orders ADD COLUMN is_comp INTEGER DEFAULT 0`, [], () => {});
        db.run(`ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'cash'`, [], () => {});
        db.run(`ALTER TABLE orders ADD COLUMN cogs_total REAL DEFAULT 0`, [], () => {});
        db.run(`ALTER TABLE orders ADD COLUMN cogs_reimbursable REAL DEFAULT 0`, [], () => {});

        // Program charges table (discounts charged to other programs)
        db.run(`
          CREATE TABLE IF NOT EXISTS program_charges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_program_id INTEGER NOT NULL,
            session_id INTEGER NOT NULL,
            order_id INTEGER,
            amount REAL NOT NULL,
            charge_type TEXT CHECK (charge_type IN ('discount', 'comp')),
            reason TEXT,
            authorized_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Add auth_pin to programs (migration)
        db.run(`ALTER TABLE cashbox_programs ADD COLUMN auth_pin TEXT`, [], () => {});

        // =====================
        // DIGITAL PAYMENTS
        // =====================

        // CashApp account balance (singleton)
        db.run(`
          CREATE TABLE IF NOT EXISTS cashapp_account (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            balance REAL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // CashApp transactions
        db.run(`
          CREATE TABLE IF NOT EXISTS cashapp_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_type TEXT CHECK (transaction_type IN ('sale', 'withdrawal')),
            amount REAL NOT NULL,
            order_id INTEGER,
            session_id INTEGER,
            notes TEXT,
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
        db.run(`CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_event_attendees_student ON event_attendees(student_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON event_attendees(event_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_status ON concession_sessions(status)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_program ON concession_sessions(program_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`);

        // New indexes for inventory and permissions
        db.run(`CREATE INDEX IF NOT EXISTS idx_inventory_lots_menu_item ON inventory_lots(menu_item_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_inventory_lots_remaining ON inventory_lots(quantity_remaining)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_inventory_transactions_menu_item ON inventory_transactions(menu_item_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_student_groups_student ON student_groups(student_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_student_groups_group ON student_groups(group_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_group_permissions_group ON group_permissions(group_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_losses_session ON losses(session_id)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_profit_distributions_session ON profit_distributions(session_id)`, [], (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Initialize cashbox singleton row
          db.run('INSERT OR IGNORE INTO cashbox (id) VALUES (1)');

          // Initialize CashApp account singleton row
          db.run('INSERT OR IGNORE INTO cashapp_account (id, balance) VALUES (1, 0)');

          // Insert default permission groups if none exist
          db.get('SELECT COUNT(*) as count FROM permission_groups', [], (err, row) => {
            if (!err && row && row.count === 0) {
              // Create default groups
              const defaultGroups = [
                {
                  name: 'Admin',
                  description: 'Full system access - can do everything',
                  permissions: ['admin.*']
                },
                {
                  name: 'Concessions Lead',
                  description: 'Manage concessions sessions, inventory, and purchases',
                  permissions: [
                    'sessions.view', 'sessions.create', 'sessions.start', 'sessions.run', 'sessions.close',
                    'inventory.view', 'inventory.count', 'inventory.adjust',
                    'purchases.enter', 'purchases.stock_update',
                    'menu.edit', 'cashbox.view'
                  ]
                },
                {
                  name: 'Concessions Worker',
                  description: 'Run concessions POS and count inventory',
                  permissions: ['sessions.view', 'sessions.run', 'inventory.view', 'inventory.count']
                },
                {
                  name: 'Events Lead',
                  description: 'Create and manage events, view all hours',
                  permissions: ['events.view', 'events.create', 'events.manage', 'hours.view_all']
                },
                {
                  name: 'Member',
                  description: 'Standard student member - can log hours and use concessions POS',
                  permissions: ['hours.log_own', 'hours.view_own', 'sessions.view', 'sessions.run']
                }
              ];

              defaultGroups.forEach((group) => {
                db.run(
                  'INSERT INTO permission_groups (name, description) VALUES (?, ?)',
                  [group.name, group.description],
                  function(err) {
                    if (!err && this.lastID) {
                      const groupId = this.lastID;
                      group.permissions.forEach((perm) => {
                        db.run('INSERT INTO group_permissions (group_id, permission) VALUES (?, ?)', [groupId, perm]);
                      });
                    }
                  }
                );
              });
            }

            // Auto-assign all existing students to Member group if they're not in any group
            setTimeout(() => {
              db.get('SELECT id FROM permission_groups WHERE name = ?', ['Member'], (err, memberGroup) => {
                if (!err && memberGroup) {
                  db.run(`
                    INSERT OR IGNORE INTO student_groups (student_id, group_id)
                    SELECT student_id, ? FROM students
                    WHERE student_id NOT IN (SELECT DISTINCT student_id FROM student_groups)
                  `, [memberGroup.id], function(err) {
                    if (!err && this.changes > 0) {
                      console.log(`Auto-assigned ${this.changes} existing students to Member group`);
                    }
                  });
                }
              });
            }, 1000); // Delay to ensure groups are created first
          });

          // Insert default programs if none exist
          db.get('SELECT COUNT(*) as count FROM cashbox_programs', [], (err, row) => {
            if (err) {
              reject(err);
              return;
            }
            if (row.count === 0) {
              const programs = ['Girls Basketball', 'Boys Basketball', 'Girls Soccer', 'Boys Soccer'];
              programs.forEach((name, index) => {
                db.run('INSERT INTO cashbox_programs (name) VALUES (?)', [name]);
              });
            }
          });

          // Insert default menu items from CSV if none exist
          db.get('SELECT COUNT(*) as count FROM menu_items', [], (err, row) => {
            if (err) {
              reject(err);
              return;
            }
            if (row.count === 0) {
              loadMenuItemsFromCSV(db);
            }
          });

          // Load students from CSV if none exist
          db.get('SELECT COUNT(*) as count FROM students', [], (err, row) => {
            if (err) {
              console.error('Error checking students:', err);
              return;
            }
            if (row.count === 0) {
              loadStudentsFromCSV(db);
            }
          });

          // Check if admin exists, if not create default
          db.get('SELECT * FROM admin WHERE id = 1', [], (err, row) => {
            if (err) {
              reject(err);
              return;
            }

            if (!row) {
              const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'changeme123';
              if (!process.env.DEFAULT_ADMIN_PASSWORD) {
                console.warn('WARNING: Using default admin password. Set DEFAULT_ADMIN_PASSWORD environment variable in production!');
              }
              const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
              db.run('INSERT INTO admin (password) VALUES (?)', [hashedPassword], (err) => {
                if (err) reject(err);
                else resolve();
              });
            } else {
              resolve();
            }
          });
        });
      });
    });
  });
};

const getDb = () => db;

module.exports = { initialize, getDb };
