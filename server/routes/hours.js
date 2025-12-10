const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

// Get hours for a specific student
router.get('/student/:studentId', (req, res) => {
  const { studentId } = req.params;
  const db = getDb();

  db.all(
    'SELECT * FROM hours WHERE student_id = ? ORDER BY date DESC, time_in DESC',
    [studentId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Get all hours (for admin)
router.get('/all', (req, res) => {
  const db = getDb();

  db.all(
    `SELECT hours.*, students.name
     FROM hours
     JOIN students ON hours.student_id = students.student_id
     ORDER BY hours.date DESC, hours.time_in DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Log hours for a student
router.post('/', (req, res) => {
  const { studentId, date, timeIn, timeOut } = req.body;
  const db = getDb();

  if (!studentId || !date || !timeIn || !timeOut) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Validate time_out is after time_in
  if (timeOut <= timeIn) {
    return res.status(400).json({ error: 'Time out must be after time in' });
  }

  db.run(
    'INSERT INTO hours (student_id, date, time_in, time_out) VALUES (?, ?, ?, ?)',
    [studentId, date, timeIn, timeOut],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Delete an hour entry
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  db.run('DELETE FROM hours WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json({ success: true });
  });
});

module.exports = router;
