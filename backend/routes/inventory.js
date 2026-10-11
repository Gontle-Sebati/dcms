const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('PHARMACIST','DOCTOR','ADMIN'), async (req, res) => {
  const [rows] = await db.query('SELECT * FROM medications ORDER BY name');
  res.json(rows);
});

router.get('/low-stock', authenticate, authorize('PHARMACIST','ADMIN'), async (req, res) => {
  const [rows] = await db.query('SELECT * FROM medications WHERE quantity_on_hand <= minimum_threshold');
  res.json(rows);
});

router.post('/', authenticate, authorize('PHARMACIST','ADMIN'), async (req, res) => {
  const { name, description, form, batch_number, expiry_date, quantity_on_hand, minimum_threshold } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO medications (name, description, form, batch_number, expiry_date, quantity_on_hand, minimum_threshold)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description || null, form || null, batch_number || null, expiry_date || null, quantity_on_hand || 0, minimum_threshold || 10]
    );
    res.status(201).json({ medication_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/stock', authenticate, authorize('PHARMACIST','ADMIN'), async (req, res) => {
  const { quantity } = req.body;
  await db.query('UPDATE medications SET quantity_on_hand = quantity_on_hand + ? WHERE medication_id = ?', [quantity, req.params.id]);
  res.json({ message: 'Stock updated' });
});




module.exports = router;
