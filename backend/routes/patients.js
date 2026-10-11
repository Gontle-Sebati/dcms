const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// LIST all patients
router.get('/', authenticate, authorize('RECEPTIONIST','NURSE','DOCTOR','ADMIN'), async (req, res) => {
  const [rows] = await db.query(
    'SELECT patient_id, first_name, last_name, id_number, phone, email FROM patients ORDER BY created_at DESC'
  );
  res.json(rows);
});

// SEARCH patients
router.get('/search', authenticate, async (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const [rows] = await db.query(
    `SELECT patient_id, first_name, last_name, id_number, phone, email, date_of_birth
     FROM patients WHERE first_name LIKE ? OR last_name LIKE ? OR id_number LIKE ? OR phone LIKE ? LIMIT 20`,
    [q, q, q, q]
  );
  res.json(rows);
});

// LIST all doctors (MUST be before /:id)
router.get('/doctors/list', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.doctor_id, u.first_name, u.last_name, d.specialization
       FROM doctors d JOIN users u ON d.user_id = u.user_id`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET a patient's own appointments (MUST be before /:id)
router.get('/:id/appointments', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT appointment_id, appointment_date, appointment_time, status, reason_for_visit
       FROM appointments WHERE patient_id = ? ORDER BY appointment_date DESC, appointment_time DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one patient (AFTER /doctors/list and /:id/appointments)
router.get('/:id', authenticate, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM patients WHERE patient_id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// REGISTER walk-in patient
router.post('/', authenticate, authorize('RECEPTIONIST','ADMIN'), async (req, res) => {
  const { first_name, last_name, id_number, date_of_birth, gender, phone, email } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO patients (first_name, last_name, id_number, date_of_birth, gender, phone, email)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, id_number || null, date_of_birth || null, gender || null, phone || null, email || null]
    );
    res.status(201).json({ patient_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;



































