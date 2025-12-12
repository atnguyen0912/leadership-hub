const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// Use /data directory for persistent storage on Fly.io, otherwise use local directory
const DATA_DIR = process.env.NODE_ENV === 'production' && fs.existsSync('/data')
  ? '/data'
  : __dirname;
const DB_PATH = path.join(DATA_DIR, 'leadership.db');

let db;

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
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES menu_items(id)
          )
        `);

        // Add grid columns if they don't exist (migration for existing DBs)
        db.run(`ALTER TABLE menu_items ADD COLUMN grid_row INTEGER DEFAULT 0`, [], () => {});
        db.run(`ALTER TABLE menu_items ADD COLUMN grid_col INTEGER DEFAULT 0`, [], () => {});

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
        `, [], (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Initialize cashbox singleton row
          db.run('INSERT OR IGNORE INTO cashbox (id) VALUES (1)');

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

          // Insert default menu items if none exist
          db.get('SELECT COUNT(*) as count FROM menu_items', [], (err, row) => {
            if (err) {
              reject(err);
              return;
            }
            if (row.count === 0) {
              // Top-level items
              db.run('INSERT INTO menu_items (name, price, display_order) VALUES (?, ?, ?)', ['Hot Dog', 3.00, 1]);
              db.run('INSERT INTO menu_items (name, price, display_order) VALUES (?, ?, ?)', ['Nachos', 4.00, 2]);
              db.run('INSERT INTO menu_items (name, price, display_order) VALUES (?, ?, ?)', ['Popcorn', 2.50, 3]);
              db.run('INSERT INTO menu_items (name, price, display_order) VALUES (?, ?, ?)', ['Candy', 2.00, 4]);
              db.run('INSERT INTO menu_items (name, price, display_order) VALUES (?, ?, ?)', ['Bottled Water', 1.00, 6]);

              // Drinks (parent with sub-items)
              db.run('INSERT INTO menu_items (name, price, display_order) VALUES (?, ?, ?)', ['Drinks', null, 5], function(err) {
                if (!err && this.lastID) {
                  const drinksId = this.lastID;
                  db.run('INSERT INTO menu_items (name, price, parent_id, display_order) VALUES (?, ?, ?, ?)', ['Small', 1.50, drinksId, 1]);
                  db.run('INSERT INTO menu_items (name, price, parent_id, display_order) VALUES (?, ?, ?, ?)', ['Medium', 2.00, drinksId, 2]);
                  db.run('INSERT INTO menu_items (name, price, parent_id, display_order) VALUES (?, ?, ?, ?)', ['Large', 2.50, drinksId, 3]);
                }
              });
            }
          });

          // Insert default test student if none exist
          db.get('SELECT COUNT(*) as count FROM students', [], (err, row) => {
            if (err) {
              console.error('Error checking students:', err);
              return;
            }
            if (row.count === 0) {
              db.run('INSERT INTO students (student_id, name) VALUES (?, ?)', ['09121999X314', 'Alex Nguyen'], (err) => {
                if (err) {
                  console.error('Error inserting default student:', err);
                } else {
                  console.log('Default test student created: Alex Nguyen (09121999X314)');
                }
              });
            }
          });

          // Check if admin exists, if not create default
          db.get('SELECT * FROM admin WHERE id = 1', [], (err, row) => {
            if (err) {
              reject(err);
              return;
            }

            if (!row) {
              const hashedPassword = bcrypt.hashSync('leadership2025', 10);
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
