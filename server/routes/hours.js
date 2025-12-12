const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const { getDb } = require('../database');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to calculate hours between two times
const calculateHours = (timeIn, timeOut) => {
  const [inH, inM] = timeIn.split(':').map(Number);
  const [outH, outM] = timeOut.split(':').map(Number);
  return (outH + outM / 60) - (inH + inM / 60);
};

// Get stats for a specific student
router.get('/stats/:studentId', (req, res) => {
  const { studentId } = req.params;
  const db = getDb();

  db.all(
    'SELECT * FROM hours WHERE student_id = ?',
    [studentId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let totalHours = 0;
      let weekHours = 0;
      let monthHours = 0;
      let totalEntries = rows.length;

      rows.forEach(row => {
        const hours = calculateHours(row.time_in, row.time_out);
        totalHours += hours;

        const entryDate = new Date(row.date);
        if (entryDate >= startOfWeek) {
          weekHours += hours;
        }
        if (entryDate >= startOfMonth) {
          monthHours += hours;
        }
      });

      res.json({
        totalHours: Math.round(totalHours * 100) / 100,
        weekHours: Math.round(weekHours * 100) / 100,
        monthHours: Math.round(monthHours * 100) / 100,
        totalEntries
      });
    }
  );
});

// Get stats for all students (admin)
router.get('/stats', (req, res) => {
  const db = getDb();

  db.all(
    `SELECT hours.*, students.name
     FROM hours
     JOIN students ON hours.student_id = students.student_id`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Get all students for complete list
      db.all('SELECT student_id, name FROM students ORDER BY name', [], (err, students) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Build per-student stats
        const studentStats = {};
        students.forEach(s => {
          studentStats[s.student_id] = {
            studentId: s.student_id,
            name: s.name,
            totalHours: 0,
            weekHours: 0,
            monthHours: 0,
            entries: 0
          };
        });

        let classTotalHours = 0;
        let classWeekHours = 0;
        let classMonthHours = 0;

        rows.forEach(row => {
          const hours = calculateHours(row.time_in, row.time_out);
          const entryDate = new Date(row.date);

          if (studentStats[row.student_id]) {
            studentStats[row.student_id].totalHours += hours;
            studentStats[row.student_id].entries += 1;

            if (entryDate >= startOfWeek) {
              studentStats[row.student_id].weekHours += hours;
            }
            if (entryDate >= startOfMonth) {
              studentStats[row.student_id].monthHours += hours;
            }
          }

          classTotalHours += hours;
          if (entryDate >= startOfWeek) classWeekHours += hours;
          if (entryDate >= startOfMonth) classMonthHours += hours;
        });

        // Convert to array and round values
        const leaderboard = Object.values(studentStats)
          .map(s => ({
            ...s,
            totalHours: Math.round(s.totalHours * 100) / 100,
            weekHours: Math.round(s.weekHours * 100) / 100,
            monthHours: Math.round(s.monthHours * 100) / 100
          }))
          .sort((a, b) => b.totalHours - a.totalHours);

        res.json({
          classStats: {
            totalStudents: students.length,
            totalHours: Math.round(classTotalHours * 100) / 100,
            weekHours: Math.round(classWeekHours * 100) / 100,
            monthHours: Math.round(classMonthHours * 100) / 100,
            averageHours: students.length > 0
              ? Math.round((classTotalHours / students.length) * 100) / 100
              : 0
          },
          leaderboard
        });
      });
    }
  );
});

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
  const { studentId, date, timeIn, timeOut, item } = req.body;
  const db = getDb();

  if (!studentId || !date || !timeIn || !timeOut) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Validate time_out is after time_in
  if (timeOut <= timeIn) {
    return res.status(400).json({ error: 'Time out must be after time in' });
  }

  // Check for duplicate entry
  db.get(
    'SELECT id FROM hours WHERE student_id = ? AND date = ? AND time_in = ? AND time_out = ?',
    [studentId, date, timeIn, timeOut],
    (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existing) {
        return res.status(400).json({ error: 'Duplicate entry: Hours for this date and time already exist' });
      }

      db.run(
        'INSERT INTO hours (student_id, date, time_in, time_out, item) VALUES (?, ?, ?, ?, ?)',
        [studentId, date, timeIn, timeOut, item || ''],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ success: true, id: this.lastID });
        }
      );
    }
  );
});

// Update an hour entry
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { date, timeIn, timeOut, item } = req.body;
  const db = getDb();

  if (!date || !timeIn || !timeOut) {
    return res.status(400).json({ error: 'Date, time in, and time out are required' });
  }

  if (timeOut <= timeIn) {
    return res.status(400).json({ error: 'Time out must be after time in' });
  }

  db.run(
    'UPDATE hours SET date = ?, time_in = ?, time_out = ?, item = ? WHERE id = ?',
    [date, timeIn, timeOut, item || '', id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      res.json({ success: true });
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

// Helper to normalize time format
const normalizeTime = (timeStr) => {
  if (!timeStr) return null;

  // Already in HH:MM format
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }

  // Handle 12-hour format (e.g., "9:00 AM", "2:30 PM")
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i);
  if (match) {
    let [, hours, minutes, period] = match;
    hours = parseInt(hours);

    if (period) {
      period = period.toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  return null;
};

// Helper to normalize date format
const normalizeDate = (date) => {
  if (!date) return null;

  let normalizedDate = date;
  if (date.includes('/')) {
    const parts = date.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    return null;
  }

  return normalizedDate;
};

// Upload CSV of hours with smart duplicate handling
router.post('/upload-csv', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const db = getDb();

  parse(req.file.buffer.toString(), {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }, (err, records) => {
    if (err) {
      return res.status(400).json({ error: 'Failed to parse CSV file' });
    }

    if (records.length === 0) {
      return res.json({ success: true, added: 0, skipped: 0, conflicts: [], errors: [] });
    }

    // Get all valid student IDs and names
    db.all('SELECT student_id, name FROM students', [], (err, students) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const studentMap = new Map(students.map(s => [s.student_id, s.name]));
      const results = [];
      const errors = [];
      const conflicts = [];
      let skipped = 0;
      let processed = 0;
      const total = records.length;

      const finishIfDone = () => {
        processed++;
        if (processed === total) {
          res.json({
            success: true,
            added: results.length,
            skipped,
            conflicts,
            errors
          });
        }
      };

      records.forEach((record, index) => {
        const rowNum = index + 2;

        // Support multiple column name formats
        const studentId = (record.student_id || record.studentId || record.StudentID || record['Student ID'] || '').toString();
        const date = record.date || record.Date || record.DATE;
        const timeIn = record.time_in || record.timeIn || record.TimeIn || record['Time In'] || record.start || record.Start;
        const timeOut = record.time_out || record.timeOut || record.TimeOut || record['Time Out'] || record.end || record.End;
        const item = record.item || record.Item || record.activity || record.Activity || record.description || '';

        // Validation
        if (!studentId) {
          errors.push(`Row ${rowNum}: Missing student ID`);
          finishIfDone();
          return;
        }

        if (!studentMap.has(studentId)) {
          errors.push(`Row ${rowNum}: Student ID "${studentId}" not found`);
          finishIfDone();
          return;
        }

        const normalizedDate = normalizeDate(date);
        if (!normalizedDate) {
          errors.push(`Row ${rowNum}: Invalid or missing date "${date}"`);
          finishIfDone();
          return;
        }

        if (!timeIn || !timeOut) {
          errors.push(`Row ${rowNum}: Missing time in or time out`);
          finishIfDone();
          return;
        }

        const normalizedTimeIn = normalizeTime(timeIn);
        const normalizedTimeOut = normalizeTime(timeOut);

        if (!normalizedTimeIn) {
          errors.push(`Row ${rowNum}: Invalid time in format "${timeIn}"`);
          finishIfDone();
          return;
        }

        if (!normalizedTimeOut) {
          errors.push(`Row ${rowNum}: Invalid time out format "${timeOut}"`);
          finishIfDone();
          return;
        }

        if (normalizedTimeOut <= normalizedTimeIn) {
          errors.push(`Row ${rowNum}: Time out must be after time in`);
          finishIfDone();
          return;
        }

        // Check for existing entry on same date for same student
        db.get(
          'SELECT id, time_in, time_out, item FROM hours WHERE student_id = ? AND date = ?',
          [studentId, normalizedDate],
          (err, existing) => {
            if (err) {
              errors.push(`Row ${rowNum}: Database error`);
              finishIfDone();
              return;
            }

            if (existing) {
              // Check if exact duplicate (same times)
              if (existing.time_in === normalizedTimeIn && existing.time_out === normalizedTimeOut) {
                // Exact duplicate - silently skip
                skipped++;
                finishIfDone();
                return;
              }

              // Different times - this is a conflict that needs resolution
              conflicts.push({
                rowNum,
                studentId,
                studentName: studentMap.get(studentId),
                date: normalizedDate,
                existing: {
                  id: existing.id,
                  timeIn: existing.time_in,
                  timeOut: existing.time_out,
                  item: existing.item || ''
                },
                new: {
                  timeIn: normalizedTimeIn,
                  timeOut: normalizedTimeOut,
                  item: item
                }
              });
              finishIfDone();
              return;
            }

            // No duplicate - insert the record
            db.run(
              'INSERT INTO hours (student_id, date, time_in, time_out, item) VALUES (?, ?, ?, ?, ?)',
              [studentId, normalizedDate, normalizedTimeIn, normalizedTimeOut, item],
              function(err) {
                if (err) {
                  errors.push(`Row ${rowNum}: Database error - ${err.message}`);
                } else {
                  results.push({ studentId, date: normalizedDate, timeIn: normalizedTimeIn, timeOut: normalizedTimeOut });
                }
                finishIfDone();
              }
            );
          }
        );
      });
    });
  });
});

// Resolve a conflict by choosing which entry to keep
router.post('/resolve-conflict', (req, res) => {
  const { existingId, action, newData } = req.body;
  // action: 'keep-existing', 'use-new', or 'keep-both'

  const db = getDb();

  if (action === 'keep-existing') {
    // Nothing to do, just acknowledge
    return res.json({ success: true, action: 'kept-existing' });
  }

  if (action === 'use-new') {
    // Update the existing entry with new times
    db.run(
      'UPDATE hours SET time_in = ?, time_out = ?, item = ? WHERE id = ?',
      [newData.timeIn, newData.timeOut, newData.item || '', existingId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, action: 'updated' });
      }
    );
    return;
  }

  if (action === 'keep-both') {
    // Insert the new entry alongside existing
    db.run(
      'INSERT INTO hours (student_id, date, time_in, time_out, item) VALUES (?, ?, ?, ?, ?)',
      [newData.studentId, newData.date, newData.timeIn, newData.timeOut, newData.item || ''],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, action: 'added', id: this.lastID });
      }
    );
    return;
  }

  res.status(400).json({ error: 'Invalid action' });
});

module.exports = router;
