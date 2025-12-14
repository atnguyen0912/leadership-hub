const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const STUDENTS_CSV_PATH = path.join(__dirname, '..', 'students.csv');

// Helper to assign student to default Member group
const assignToMemberGroup = (db, studentId) => {
  // Find the Member group and add student to it
  db.get('SELECT id FROM permission_groups WHERE name = ?', ['Member'], (err, group) => {
    if (!err && group) {
      db.run(
        'INSERT OR IGNORE INTO student_groups (student_id, group_id) VALUES (?, ?)',
        [studentId, group.id]
      );
    }
  });
};

// Student ID validation: 6 digits + M/F/X + 3 digits (e.g., 123456M789)
const STUDENT_ID_REGEX = /^\d{6}[MFX]\d{3}$/;

const validateStudentId = (id) => {
  return STUDENT_ID_REGEX.test(id);
};

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

// Get a single student by student_id
router.get('/:studentId', (req, res) => {
  const { studentId } = req.params;
  const db = getDb();

  db.get('SELECT * FROM students WHERE student_id = ?', [studentId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(row);
  });
});

// Add a single student
router.post('/', (req, res) => {
  const { studentId, name } = req.body;
  const db = getDb();

  if (!studentId || !name) {
    return res.status(400).json({ error: 'Student ID and name are required' });
  }

  // Validate student ID format
  if (!validateStudentId(studentId)) {
    return res.status(400).json({ error: 'Invalid Student ID format. Must be 6 digits + M/F/X + 3 digits (e.g., 123456M789)' });
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

      // Auto-assign to Member group
      assignToMemberGroup(db, studentId);

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

      // Validate student ID format
      const studentIdStr = studentId.toString().toUpperCase();
      if (!validateStudentId(studentIdStr)) {
        errors.push(`Invalid Student ID format: ${studentId} (must be 6 digits + M/F/X + 3 digits)`);
        processed++;
        if (processed === total) {
          res.json({ success: true, added: results.length, errors });
        }
        return;
      }

      db.run(
        'INSERT INTO students (student_id, name) VALUES (?, ?)',
        [studentIdStr, name],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              errors.push(`Student ID ${studentId} already exists`);
            } else {
              errors.push(`Error adding ${studentId}: ${err.message}`);
            }
          } else {
            results.push({ studentId, name });
            // Auto-assign to Member group
            assignToMemberGroup(db, studentIdStr);
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

// Save students to CSV file on server
router.post('/save-to-csv', (req, res) => {
  const db = getDb();

  db.all('SELECT student_id, name, is_lead, lead_type FROM students ORDER BY name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Build CSV content
    let csvContent = 'student_id,name,is_lead,lead_type\n';
    rows.forEach(row => {
      const leadType = row.lead_type || '';
      csvContent += `${row.student_id},${row.name},${row.is_lead},${leadType}\n`;
    });

    try {
      fs.writeFileSync(STUDENTS_CSV_PATH, csvContent);
      res.json({ success: true, message: `Saved ${rows.length} students to CSV` });
    } catch (writeErr) {
      console.error('Error writing students CSV:', writeErr);
      res.status(500).json({ error: 'Failed to write CSV file' });
    }
  });
});

// Get students as CSV (for download)
router.get('/csv', (req, res) => {
  const db = getDb();

  db.all('SELECT student_id, name, is_lead, lead_type FROM students ORDER BY name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Build CSV content
    let csvContent = 'student_id,name,is_lead,lead_type\n';
    rows.forEach(row => {
      const leadType = row.lead_type || '';
      csvContent += `${row.student_id},${row.name},${row.is_lead},${leadType}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
    res.send(csvContent);
  });
});

// Reset students from CSV file
router.post('/reset-from-csv', (req, res) => {
  const db = getDb();

  if (!fs.existsSync(STUDENTS_CSV_PATH)) {
    return res.status(404).json({ error: 'No students.csv file found' });
  }

  try {
    const csvContent = fs.readFileSync(STUDENTS_CSV_PATH, 'utf-8');
    const { parse: parseSync } = require('csv-parse/sync');
    const records = parseSync(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    // Clear existing students (this will also cascade delete hours)
    db.run('DELETE FROM hours', [], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to clear hours' });
      }

      db.run('DELETE FROM students', [], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to clear students' });
        }

        // Insert students from CSV
        let inserted = 0;
        records.forEach((record) => {
          const isLead = record.is_lead === '1' || record.is_lead === 'true' ? 1 : 0;
          const leadType = record.lead_type && record.lead_type.trim() !== '' ? record.lead_type.trim() : null;

          db.run(
            'INSERT INTO students (student_id, name, is_lead, lead_type) VALUES (?, ?, ?, ?)',
            [record.student_id, record.name, isLead, leadType],
            function(err) {
              if (!err) inserted++;
              if (inserted === records.length) {
                res.json({ success: true, message: `Loaded ${inserted} students from CSV` });
              }
            }
          );
        });

        if (records.length === 0) {
          res.json({ success: true, message: 'No students in CSV file' });
        }
      });
    });
  } catch (readErr) {
    console.error('Error reading students CSV:', readErr);
    res.status(500).json({ error: 'Failed to read CSV file' });
  }
});

module.exports = router;
