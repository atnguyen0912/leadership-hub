/**
 * Promisified database utilities for async/await usage
 * Wraps SQLite callback-based methods in promises
 */

const { getDb } = require('./database');

/**
 * Run a query that doesn't return rows (INSERT, UPDATE, DELETE)
 * @param {string} sql - SQL statement
 * @param {Array} params - Parameters for the query
 * @returns {Promise<{lastID: number, changes: number}>}
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Get a single row
 * @param {string} sql - SQL statement
 * @param {Array} params - Parameters for the query
 * @returns {Promise<Object|undefined>}
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Get all matching rows
 * @param {string} sql - SQL statement
 * @param {Array} params - Parameters for the query
 * @returns {Promise<Array>}
 */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Execute multiple statements in a transaction
 * @param {Function} callback - Async function receiving { run, get, all } methods
 * @returns {Promise<any>}
 */
async function transaction(callback) {
  const db = getDb();

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION', async (err) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          const result = await callback({ run, get, all });
          db.run('COMMIT', (err) => {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
            } else {
              resolve(result);
            }
          });
        } catch (error) {
          db.run('ROLLBACK', () => {
            reject(error);
          });
        }
      });
    });
  });
}

module.exports = { run, get, all, transaction };
