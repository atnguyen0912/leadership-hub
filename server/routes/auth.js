const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../database');

const router = express.Router();

// Student login - just verify student ID exists
router.post('/student-login', (req, res) => {
  const { studentId } = req.body;
  const db = getDb();

  db.get('SELECT * FROM students WHERE student_id = ?', [studentId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(401).json({ error: 'Student ID not found' });
    }

    res.json({
      success: true,
      user: {
        type: 'student',
        studentId: row.student_id,
        name: row.name
      }
    });
  });
});

// Admin login
router.post('/admin-login', (req, res) => {
  const { password } = req.body;
  const db = getDb();

  db.get('SELECT * FROM admin WHERE id = 1', [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row || !bcrypt.compareSync(password, row.password)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    res.json({
      success: true,
      user: {
        type: 'admin'
      }
    });
  });
});

// Change admin password
router.post('/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const db = getDb();

  db.get('SELECT * FROM admin WHERE id = 1', [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row || !bcrypt.compareSync(currentPassword, row.password)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.run('UPDATE admin SET password = ? WHERE id = 1', [hashedPassword], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update password' });
      }
      res.json({ success: true });
    });
  });
});

module.exports = router;
