const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/patient/:id', authenticate, authorize('DOCTOR','NURSE','ADMIN'), async (req, res) => {
  const [rows] = await db.query(
    `SELECT mr.*, u.first_name AS doctor_first, u.last_name AS doctor_last
     FROM medical_records mr
     LEFT JOIN doctors d ON mr.doctor_id = d.doctor_id
     LEFT JOIN users u ON d.user_id = u.user_id
     WHERE mr.patient_id = ?
     ORDER BY mr.created_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});

router.post('/', authenticate, authorize('DOCTOR'), async (req, res) => {
  const { patient_id, doctor_id, diagnosis_code, diagnosis_description, treatment_plan, vitals, followup_date } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO medical_records (patient_id, doctor_id, diagnosis_code, diagnosis_description, treatment_plan, vitals, followup_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, doctor_id || null, diagnosis_code, diagnosis_description, treatment_plan, JSON.stringify(vitals || {}), followup_date || null]
    );
    res.status(201).json({ record_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
