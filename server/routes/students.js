const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const { getDb } = require('../database');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all students
router.get('/', (req, res) => {
  const db = getDb();

  db.all('SELECT * FROM students ORDER BY name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Add a single student
router.post('/', (req, res) => {
  const { studentId, name } = req.body;
  const db = getDb();

  if (!studentId || !name) {
    return res.status(400).json({ error: 'Student ID and name are required' });
  }

  db.run(
    'INSERT INTO students (student_id, name) VALUES (?, ?)',
    [studentId, name],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Student ID already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Upload CSV roster
router.post('/upload-csv', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const db = getDb();
  const results = [];
  const errors = [];

  parse(req.file.buffer.toString(), {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }, (err, records) => {
    if (err) {
      return res.status(400).json({ error: 'Failed to parse CSV file' });
    }

    let processed = 0;
    const total = records.length;

    if (total === 0) {
      return res.json({ success: true, added: 0, errors: [] });
    }

    records.forEach((record) => {
      const studentId = record.student_id || record.studentId || record.StudentID || record['Student ID'];
      const name = record.name || record.Name || record.full_name || record['Full Name'];

      if (!studentId || !name) {
        errors.push(`Missing data in row: ${JSON.stringify(record)}`);
        processed++;
        if (processed === total) {
          res.json({ success: true, added: results.length, errors });
        }
        return;
      }

      db.run(
        'INSERT INTO students (student_id, name) VALUES (?, ?)',
        [studentId.toString(), name],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              errors.push(`Student ID ${studentId} already exists`);
            } else {
              errors.push(`Error adding ${studentId}: ${err.message}`);
            }
          } else {
            results.push({ studentId, name });
          }

          processed++;
          if (processed === total) {
            res.json({ success: true, added: results.length, errors });
          }
        }
      );
    });
  });
});

// Set student lead status and type
router.post('/:studentId/set-lead', (req, res) => {
  const { studentId } = req.params;
  const { leadType } = req.body; // 'events', 'concessions', or null to remove
  const db = getDb();

  db.get('SELECT * FROM students WHERE student_id = ?', [studentId], (err, student) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const isLead = leadType ? 1 : 0;
    const type = leadType || null;

    db.run(
      'UPDATE students SET is_lead = ?, lead_type = ? WHERE student_id = ?',
      [isLead, type, studentId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, isLead: isLead === 1, leadType: type });
      }
    );
  });
});

// Toggle student lead status (legacy - still works but set-lead is preferred)
router.post('/:studentId/toggle-lead', (req, res) => {
  const { studentId } = req.params;
  const db = getDb();

  db.get('SELECT is_lead, lead_type FROM students WHERE student_id = ?', [studentId], (err, student) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // If currently a lead, remove lead status
    // If not a lead, make them an events lead by default
    const newStatus = student.is_lead ? 0 : 1;
    const newType = newStatus ? 'events' : null;

    db.run(
      'UPDATE students SET is_lead = ?, lead_type = ? WHERE student_id = ?',
      [newStatus, newType, studentId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, isLead: newStatus === 1, leadType: newType });
      }
    );
  });
});

// Search students by name or ID
router.get('/search', (req, res) => {
  const { q } = req.query;
  const db = getDb();

  if (!q || q.length < 2) {
    return res.json([]);
  }

  db.all(
    `SELECT * FROM students WHERE name LIKE ? OR student_id LIKE ? ORDER BY name LIMIT 10`,
    [`%${q}%`, `%${q}%`],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Delete a student
router.delete('/:studentId', (req, res) => {
  const { studentId } = req.params;
  const db = getDb();

  // First delete related hours
  db.run('DELETE FROM hours WHERE student_id = ?', [studentId], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Then delete the student
    db.run('DELETE FROM students WHERE student_id = ?', [studentId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      res.json({ success: true });
    });
  });
});

module.exports = router;
