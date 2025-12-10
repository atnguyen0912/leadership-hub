const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'leadership.db');

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
            name TEXT NOT NULL
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
        `, [], (err) => {
          if (err) {
            reject(err);
            return;
          }

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
