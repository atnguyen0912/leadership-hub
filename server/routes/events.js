const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

// Generate random check-in code
const generateCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// GET /api/events - Get all events (with filters)
router.get('/', (req, res) => {
  const { status, createdBy } = req.query;
  const db = getDb();

  let query = `
    SELECT e.*, s.name as creator_name,
           (SELECT COUNT(*) FROM event_attendees WHERE event_id = e.id) as attendee_count
    FROM events e
    LEFT JOIN students s ON e.created_by = s.student_id
  `;
  const params = [];
  const conditions = [];

  if (status) {
    conditions.push('e.status = ?');
    params.push(status);
  }
  if (createdBy) {
    conditions.push('e.created_by = ?');
    params.push(createdBy);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY e.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// GET /api/events/active - Get active events for students
router.get('/active', (req, res) => {
  const db = getDb();

  db.all(
    `SELECT e.*, s.name as creator_name,
            (SELECT COUNT(*) FROM event_attendees WHERE event_id = e.id) as attendee_count
     FROM events e
     LEFT JOIN students s ON e.created_by = s.student_id
     WHERE e.status IN ('approved', 'active')
     ORDER BY e.start_date ASC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// GET /api/events/:id - Get single event with attendees
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  db.get(
    `SELECT e.*, s.name as creator_name
     FROM events e
     LEFT JOIN students s ON e.created_by = s.student_id
     WHERE e.id = ?`,
    [id],
    (err, event) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Get attendees
      db.all(
        `SELECT ea.*, s.name as student_name
         FROM event_attendees ea
         JOIN students s ON ea.student_id = s.student_id
         WHERE ea.event_id = ?
         ORDER BY s.name`,
        [id],
        (err, attendees) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ ...event, attendees });
        }
      );
    }
  );
});

// POST /api/events - Create new event (leads only)
router.post('/', (req, res) => {
  const { name, description, startDate, endDate, defaultTimeIn, defaultTimeOut, createdBy } = req.body;
  const db = getDb();

  if (!name || !startDate || !endDate || !defaultTimeIn || !defaultTimeOut || !createdBy) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Verify creator is a lead
  db.get('SELECT is_lead FROM students WHERE student_id = ?', [createdBy], (err, student) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    if (!student.is_lead) {
      return res.status(403).json({ error: 'Only student leads can create events' });
    }

    db.run(
      `INSERT INTO events (name, description, start_date, end_date, default_time_in, default_time_out, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [name, description || '', startDate, endDate, defaultTimeIn, defaultTimeOut, createdBy],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, id: this.lastID });
      }
    );
  });
});

// POST /api/events/:id/approve - Approve event (admin only)
router.post('/:id/approve', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const code = generateCode();

  db.run(
    `UPDATE events SET status = 'approved', check_in_code = ?, approved_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = 'pending'`,
    [code, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(400).json({ error: 'Event not found or already processed' });
      }
      res.json({ success: true, checkInCode: code });
    }
  );
});

// POST /api/events/:id/activate - Activate event (starts check-in)
router.post('/:id/activate', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  db.run(
    `UPDATE events SET status = 'active' WHERE id = ? AND status = 'approved'`,
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(400).json({ error: 'Event not found or not approved' });
      }
      res.json({ success: true });
    }
  );
});

// POST /api/events/:id/complete - Complete event and log hours for all attendees
router.post('/:id/complete', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  // Get event details
  db.get('SELECT * FROM events WHERE id = ?', [id], (err, event) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (event.status === 'completed') {
      return res.status(400).json({ error: 'Event already completed' });
    }

    // Get all checked-in attendees who haven't had hours logged
    db.all(
      `SELECT * FROM event_attendees WHERE event_id = ? AND checked_in = 1 AND hours_logged = 0`,
      [id],
      (err, attendees) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Log hours for each attendee
        const stmt = db.prepare(
          `INSERT INTO hours (student_id, date, time_in, time_out, item) VALUES (?, ?, ?, ?, ?)`
        );

        attendees.forEach(attendee => {
          // For multi-day events, we'd log each day. For simplicity, log the end date
          stmt.run(
            attendee.student_id,
            event.end_date,
            event.default_time_in,
            event.default_time_out,
            `Event: ${event.name}`
          );
        });

        stmt.finalize();

        // Mark attendees as hours logged
        db.run(
          `UPDATE event_attendees SET hours_logged = 1 WHERE event_id = ? AND checked_in = 1`,
          [id]
        );

        // Mark event as completed
        db.run(
          `UPDATE events SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [id],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, hoursLoggedFor: attendees.length });
          }
        );
      }
    );
  });
});

// POST /api/events/:id/cancel - Cancel event
router.post('/:id/cancel', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  db.run(
    `UPDATE events SET status = 'cancelled' WHERE id = ? AND status != 'completed'`,
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(400).json({ error: 'Event not found or already completed' });
      }
      res.json({ success: true });
    }
  );
});

// POST /api/events/:id/attendees - Add attendee manually (lead)
router.post('/:id/attendees', (req, res) => {
  const { id } = req.params;
  const { studentId } = req.body;
  const db = getDb();

  if (!studentId) {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  db.run(
    `INSERT OR IGNORE INTO event_attendees (event_id, student_id, checked_in, checked_in_at)
     VALUES (?, ?, 1, CURRENT_TIMESTAMP)`,
    [id, studentId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, added: this.changes > 0 });
    }
  );
});

// POST /api/events/join - Join event with code (student self-join)
router.post('/join', (req, res) => {
  const { code, studentId } = req.body;
  const db = getDb();

  if (!code || !studentId) {
    return res.status(400).json({ error: 'Code and student ID are required' });
  }

  // Find event by code
  db.get(
    `SELECT * FROM events WHERE check_in_code = ? AND status IN ('approved', 'active')`,
    [code.toUpperCase()],
    (err, event) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!event) {
        return res.status(404).json({ error: 'Invalid code or event not active' });
      }

      // Add student as attendee
      db.run(
        `INSERT OR IGNORE INTO event_attendees (event_id, student_id, checked_in, checked_in_at)
         VALUES (?, ?, 1, CURRENT_TIMESTAMP)`,
        [event.id, studentId],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({
            success: true,
            event: { id: event.id, name: event.name },
            alreadyJoined: this.changes === 0
          });
        }
      );
    }
  );
});

// DELETE /api/events/:id/attendees/:studentId - Remove attendee
router.delete('/:id/attendees/:studentId', (req, res) => {
  const { id, studentId } = req.params;
  const db = getDb();

  db.run(
    `DELETE FROM event_attendees WHERE event_id = ? AND student_id = ? AND hours_logged = 0`,
    [id, studentId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(400).json({ error: 'Attendee not found or hours already logged' });
      }
      res.json({ success: true });
    }
  );
});

module.exports = router;
