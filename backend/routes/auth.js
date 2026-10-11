const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();


router.post('/login', async (req, res) => {
const { email, password } = req.body;
if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    await db.query('UPDATE users SET last_login = NOW() WHERE user_id = ?', [user.user_id]);

    const token = jwt.sign(
    { id: user.user_id, role: user.role, name: `${user.first_name} ${user.last_name}` },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
    );

    res.json({
    token,
    user: { id: user.user_id, email: user.email, role: user.role, name: `${user.first_name} ${user.last_name}` }
    });
} catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
}
});

router.post('/register/patient', async (req, res) => {
const { first_name, last_name, email, password, phone, id_number, date_of_birth, gender } = req.body;
if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ error: 'Required fields missing' });
}

try {
    const [existing] = await db.query(
    'SELECT patient_id FROM patients WHERE email = ? OR (id_number IS NOT NULL AND id_number = ?)',
    [email, id_number || null]
    );
    if (existing.length > 0) return res.status(409).json({ error: 'Patient already registered' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
    `INSERT INTO patients (first_name, last_name, email, password, phone, id_number, date_of_birth, gender)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [first_name, last_name, email, hash, phone || null, id_number || null, date_of_birth || null, gender || null]
    );

    res.status(201).json({ message: 'Registration successful', patient_id: result.insertId });
} catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
}
});

router.post('/login/patient', async (req, res) => {
const { email, password } = req.body;
try {
    const [rows] = await db.query('SELECT * FROM patients WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const patient = rows[0];
    if (!patient.password) return res.status(401).json({ error: 'No password set. Contact reception.' });

    const match = await bcrypt.compare(password, patient.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
    { id: patient.patient_id, role: 'PATIENT', name: `${patient.first_name} ${patient.last_name}` },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
    );

    res.json({
    token,
    user: { id: patient.patient_id, name: `${patient.first_name} ${patient.last_name}`, role: 'PATIENT' }
    });
} catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
}
});

module.exports = router;
// GET all users (admin only)
router.get('/users', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT user_id, email, role, first_name, last_name, is_active, last_login, created_at FROM users ORDER BY user_id'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new staff (admin only)
router.post('/register/staff', authenticate, authorize('ADMIN'), async (req, res) => {
  const { first_name, last_name, email, password, role } = req.body;
  if (!first_name || !last_name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields required' });
  }
  try {
    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ error: 'Email already exists' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (email, password, role, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
      [email, hash, role, first_name, last_name]
    );

    // If role is DOCTOR, also create a doctor record
    if (role === 'DOCTOR') {
      await db.query('INSERT INTO doctors (user_id, specialization) VALUES (?, ?)', [result.insertId, 'General']);
    }

    res.status(201).json({ user_id: result.insertId, message: 'Staff created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
