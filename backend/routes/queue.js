const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const [rows] = await db.query(
    `SELECT q.queue_id, q.position, q.priority, q.status, q.entered_at,
            p.first_name, p.last_name, p.patient_id
     FROM queue q
     JOIN patients p ON q.patient_id = p.patient_id
     WHERE q.status = 'Waiting'
     ORDER BY FIELD(q.priority,'Red','Orange','Yellow','Green'), q.entered_at`
  );
  res.json(rows);
});
router.post('/', authenticate, authorize('RECEPTIONIST','NURSE','DOCTOR','ADMIN'), async (req, res) => {
  const { patient_id, appointment_id, priority } = req.body;
  try {
    // Insert with position 0 initially
    const [result] = await db.query(
      `INSERT INTO queue (patient_id, appointment_id, position, priority, status) VALUES (?, ?, 0, ?, 'Waiting')`,
      [patient_id, appointment_id || null, priority || 'Green']
    );

    // Re-number all waiting patients by priority + arrival
    const [waiting] = await db.query(
      `SELECT queue_id FROM queue WHERE status='Waiting'
       ORDER BY FIELD(priority,'Red','Orange','Yellow','Green'), entered_at`
    );
    for (let i = 0; i < waiting.length; i++) {
      await db.query('UPDATE queue SET position = ? WHERE queue_id = ?', [i + 1, waiting[i].queue_id]);
    }

    // Return this patient's new position
    const [me] = await db.query('SELECT position FROM queue WHERE queue_id = ?', [result.insertId]);
    res.status(201).json({ queue_id: result.insertId, position: me[0].position });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
router.patch('/:id/served', authenticate, authorize('NURSE','DOCTOR','ADMIN'), async (req, res) => {
  try {
    await db.query(`UPDATE queue SET status='Served', called_at=NOW() WHERE queue_id = ?`, [req.params.id]);

    // Re-number remaining waiting patients
    const [waiting] = await db.query(
      `SELECT queue_id FROM queue WHERE status='Waiting'
    ORDER BY FIELD(priority,'Red','Orange','Yellow','Green'), entered_at`
    );
    for (let i = 0; i < waiting.length; i++) {
      await db.query('UPDATE queue SET position = ? WHERE queue_id = ?', [i + 1, waiting[i].queue_id]);
    }

    res.json({ message: 'Marked served' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
