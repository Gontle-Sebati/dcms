const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET — notifications for the logged-in patient
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT notification_id, message, type, is_read, created_at
       FROM notifications 
       WHERE patient_id = ? 
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET notifications error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH — mark ONE as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND patient_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Marked read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH — mark ALL as read
router.patch('/read-all/mine', authenticate, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE patient_id = ?',
      [req.user.id]
    );
    res.json({ message: 'All marked read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;