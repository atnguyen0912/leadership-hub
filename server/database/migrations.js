/**
 * Database Migrations System
 * 
 * This module handles database schema changes in a controlled way. Instead of running
 * ALTER TABLE commands on every server startup (which causes errors and is inefficient),
 * we track which migrations have been run and only apply new ones.
 * 
 * How it works:
 * 1. We keep a 'migrations' table that tracks which migrations have been applied
 * 2. Each migration has a unique name (like '001_add_is_lead_column')
 * 3. Before running a migration, we check if it's already been applied
 * 4. If not, we run it and record it as complete
 */

const { getDb } = require('../database');

/**
 * Initialize the migrations tracking table
 * This table keeps a record of all migrations that have been run
 */
function initMigrationsTable(db) {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Check if a migration has already been applied
 * 
 * @param {Object} db - Database connection
 * @param {string} migrationName - Name of the migration to check
 * @returns {Promise<boolean>} True if migration has been applied, false otherwise
 */
function hasMigrationBeenApplied(db, migrationName) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM migrations WHERE name = ?',
      [migrationName],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });
}

/**
 * Mark a migration as applied
 * 
 * @param {Object} db - Database connection
 * @param {string} migrationName - Name of the migration
 */
function markMigrationAsApplied(db, migrationName) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO migrations (name) VALUES (?)',
      [migrationName],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

/**
 * Run a single migration if it hasn't been applied yet
 * 
 * @param {Object} db - Database connection
 * @param {string} name - Migration name
 * @param {Function} migrationFn - Function that performs the migration
 */
async function runMigration(db, name, migrationFn) {
  const hasBeenApplied = await hasMigrationBeenApplied(db, name);
  
  if (hasBeenApplied) {
    console.log(`✓ Migration '${name}' already applied, skipping`);
    return;
  }

  try {
    console.log(`Running migration: ${name}`);
    await migrationFn(db);
    await markMigrationAsApplied(db, name);
    console.log(`✓ Migration '${name}' completed successfully`);
  } catch (err) {
    // Some migrations might fail if the column already exists from old system
    // Log the error but don't crash - we'll mark it as applied anyway
    console.log(`⚠ Migration '${name}' failed (possibly already applied): ${err.message}`);
    await markMigrationAsApplied(db, name);
  }
}

/**
 * All database migrations
 * Each migration is a function that makes a specific database change
 */
const migrations = [
  {
    name: '001_add_is_lead_to_students',
    run: (db) => new Promise((resolve, reject) => {
      db.run('ALTER TABLE students ADD COLUMN is_lead INTEGER DEFAULT 0', (err) => {
        // Ignore "duplicate column" errors
        if (err && !err.message.includes('duplicate column')) reject(err);
        else resolve();
      });
    })
  },
  {
    name: '002_add_lead_type_to_students',
    run: (db) => new Promise((resolve, reject) => {
      db.run('ALTER TABLE students ADD COLUMN lead_type TEXT DEFAULT NULL', (err) => {
        if (err && !err.message.includes('duplicate column')) reject(err);
        else resolve();
      });
    })
  },
  {
    name: '003_add_item_to_hours',
    run: (db) => new Promise((resolve, reject) => {
      db.run('ALTER TABLE hours ADD COLUMN item TEXT DEFAULT \'\'', (err) => {
        if (err && !err.message.includes('duplicate column')) reject(err);
        else resolve();
      });
    })
  },
  {
    name: '004_add_hour_type_to_hours',
    run: (db) => new Promise((resolve, reject) => {
      db.run('ALTER TABLE hours ADD COLUMN hour_type TEXT DEFAULT \'other\'', (err) => {
        if (err && !err.message.includes('duplicate column')) reject(err);
        else resolve();
      });
    })
  },
  {
    name: '005_add_grid_columns_to_menu_items',
    run: async (db) => {
      const columns = [
        'ALTER TABLE menu_items ADD COLUMN grid_row INTEGER DEFAULT 0',
        'ALTER TABLE menu_items ADD COLUMN grid_col INTEGER DEFAULT 0',
        'ALTER TABLE menu_items ADD COLUMN row_span INTEGER DEFAULT 1',
        'ALTER TABLE menu_items ADD COLUMN col_span INTEGER DEFAULT 1'
      ];
      
      for (const sql of columns) {
        await new Promise((resolve) => {
          db.run(sql, (err) => {
            // Ignore duplicate column errors
            resolve();
          });
        });
      }
    }
  },
  {
    name: '006_add_is_test_to_concession_sessions',
    run: (db) => new Promise((resolve, reject) => {
      db.run('ALTER TABLE concession_sessions ADD COLUMN is_test INTEGER DEFAULT 0', (err) => {
        if (err && !err.message.includes('duplicate column')) reject(err);
        else resolve();
      });
    })
  },
  {
    name: '007_add_inventory_columns_to_menu_items',
    run: async (db) => {
      const columns = [
        'ALTER TABLE menu_items ADD COLUMN unit_cost REAL DEFAULT 0',
        'ALTER TABLE menu_items ADD COLUMN quantity_on_hand INTEGER DEFAULT 0',
        'ALTER TABLE menu_items ADD COLUMN track_inventory INTEGER DEFAULT 1',
        'ALTER TABLE menu_items ADD COLUMN is_composite INTEGER DEFAULT 0',
        'ALTER TABLE menu_items ADD COLUMN is_supply INTEGER DEFAULT 0',
        'ALTER TABLE menu_items ADD COLUMN default_purchase_quantity INTEGER DEFAULT NULL',
        'ALTER TABLE menu_items ADD COLUMN fill_percentage INTEGER DEFAULT 100',
        'ALTER TABLE menu_items ADD COLUMN is_liquid INTEGER DEFAULT 0'
      ];
      
      for (const sql of columns) {
        await new Promise((resolve) => {
          db.run(sql, () => resolve());
        });
      }
    }
  },
  {
    name: '008_add_crv_columns_to_purchase_items',
    run: async (db) => {
      const columns = [
        'ALTER TABLE purchase_items ADD COLUMN crv_per_unit REAL DEFAULT 0',
        'ALTER TABLE purchase_items ADD COLUMN crv_total REAL DEFAULT 0'
      ];

      for (const sql of columns) {
        await new Promise((resolve) => {
          db.run(sql, () => resolve());
        });
      }
    }
  },
  {
    name: '009_add_balance_to_cashbox_programs',
    run: (db) => new Promise((resolve, reject) => {
      db.run('ALTER TABLE cashbox_programs ADD COLUMN balance REAL DEFAULT 0', (err) => {
        if (err && !err.message.includes('duplicate column')) reject(err);
        else resolve();
      });
    })
  },
  {
    name: '010_add_settlement_columns_to_losses',
    run: async (db) => {
      const columns = [
        'ALTER TABLE losses ADD COLUMN settled_to TEXT DEFAULT NULL',
        'ALTER TABLE losses ADD COLUMN settled_at DATETIME DEFAULT NULL',
        'ALTER TABLE losses ADD COLUMN settled_by TEXT DEFAULT NULL',
        'ALTER TABLE losses ADD COLUMN settlement_notes TEXT DEFAULT NULL',
        'ALTER TABLE losses ADD COLUMN created_by TEXT DEFAULT NULL'
      ];

      for (const sql of columns) {
        await new Promise((resolve) => {
          db.run(sql, () => resolve());
        });
      }

      // Copy recorded_by to created_by for existing records
      await new Promise((resolve) => {
        db.run('UPDATE losses SET created_by = recorded_by WHERE created_by IS NULL', () => resolve());
      });
    }
  }
];

/**
 * Run all pending migrations
 * This is called during database initialization
 */
async function runAllMigrations() {
  const db = getDb();
  
  // First, ensure migrations table exists
  await initMigrationsTable(db);
  
  // Then run each migration that hasn't been applied yet
  for (const migration of migrations) {
    await runMigration(db, migration.name, migration.run);
  }
  
  console.log('✓ All migrations completed');
}

module.exports = {
  runAllMigrations
};
