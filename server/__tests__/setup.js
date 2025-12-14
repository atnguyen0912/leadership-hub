const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

let testDb;

// Create an in-memory test database
const createTestDb = () => {
  return new Promise((resolve, reject) => {
    testDb = new sqlite3.Database(':memory:', (err) => {
      if (err) reject(err);
      else resolve(testDb);
    });
  });
};

// Initialize test database with schema
const initTestSchema = () => {
  return new Promise((resolve, reject) => {
    testDb.serialize(() => {
      // Admin table
      testDb.run(`
        CREATE TABLE admin (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          password TEXT NOT NULL
        )
      `);

      // Students table
      testDb.run(`
        CREATE TABLE students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          grade INTEGER,
          is_lead INTEGER DEFAULT 0,
          lead_type TEXT,
          joined_date DATE DEFAULT CURRENT_DATE,
          period INTEGER DEFAULT NULL,
          active INTEGER DEFAULT 1
        )
      `);

      // Hours table
      testDb.run(`
        CREATE TABLE hours (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          date DATE NOT NULL,
          hours REAL NOT NULL,
          event TEXT,
          approved INTEGER DEFAULT 0,
          FOREIGN KEY (student_id) REFERENCES students (id)
        )
      `);

      // Menu items table
      testDb.run(`
        CREATE TABLE menu_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price REAL,
          parent_id INTEGER,
          display_order INTEGER DEFAULT 0,
          grid_row INTEGER DEFAULT -1,
          grid_col INTEGER DEFAULT -1,
          row_span INTEGER DEFAULT 1,
          col_span INTEGER DEFAULT 1,
          FOREIGN KEY (parent_id) REFERENCES menu_items (id)
        )
      `);

      // Cashbox sessions table
      testDb.run(`
        CREATE TABLE cashbox_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          end_time DATETIME,
          start_cash REAL,
          end_cash REAL,
          expected_cash REAL,
          status TEXT DEFAULT 'open'
        )
      `);

      // Insert default admin with test password
      const hashedPassword = bcrypt.hashSync('testpassword', 10);
      testDb.run('INSERT INTO admin (password) VALUES (?)', [hashedPassword]);

      // Insert test student
      testDb.run(`
        INSERT INTO students (student_id, name, email, grade, is_lead)
        VALUES ('TEST001', 'Test Student', 'test@test.com', 10, 0)
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};

const getTestDb = () => testDb;

const closeTestDb = () => {
  return new Promise((resolve) => {
    if (testDb) {
      testDb.close(() => {
        testDb = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
};

// Mock the database module
jest.mock('../database', () => ({
  initialize: jest.fn().mockResolvedValue(),
  getDb: () => require('./setup').getTestDb()
}));

module.exports = {
  createTestDb,
  initTestSchema,
  getTestDb,
  closeTestDb
};
