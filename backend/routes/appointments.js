const express = require('express');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET today's appointments
router.get('/today', authenticate, async (req, res) => {
  const [rows] = await db.query(
    `SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status, a.reason_for_visit, a.doctor_id,
            p.first_name, p.last_name, p.patient_id
     FROM appointments a
     JOIN patients p ON a.patient_id = p.patient_id
     WHERE a.appointment_date = CURDATE()
     ORDER BY a.appointment_time`
  );
  res.json(rows);
});

// GET all upcoming approved appointments (Booked or Completed, from today onwards)
router.get('/approved', authenticate, authorize('DOCTOR','RECEPTIONIST','ADMIN'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.appointment_id, a.appointment_date, a.appointment_time, a.status, a.reason_for_visit,
              p.first_name, p.last_name, p.patient_id
       FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       WHERE a.status IN ('Booked', 'Completed')
       AND a.appointment_date >= CURDATE()
       ORDER BY a.appointment_date, a.appointment_time
       LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  
    
  
  }
});

// GET pending appointment requests
router.get('/pending', authenticate, authorize('DOCTOR','ADMIN'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, p.first_name, p.last_name FROM appointments a
       JOIN patients p ON a.patient_id = p.patient_id
       WHERE a.status = 'Pending' ORDER BY a.appointment_date, a.appointment_time`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — book a new appointment
router.post('/', authenticate, async (req, res) => {
  const { patient_id, doctor_id, appointment_date, appointment_time, reason_for_visit } = req.body;
  try {
    if (doctor_id) {
      const [clash] = await db.query(
        `SELECT appointment_id FROM appointments 
         WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status != 'Cancelled'`,
        [doctor_id, appointment_date, appointment_time]
      );
      if (clash.length > 0) return res.status(409).json({ error: 'Slot already booked' });
    }

    const [result] = await db.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason_for_visit, status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`,
      [patient_id, doctor_id || null, appointment_date, appointment_time, reason_for_visit || null]
    );
    res.status(201).json({ appointment_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH — update appointment status + create notification
router.patch('/:id/status', authenticate, authorize('DOCTOR','RECEPTIONIST','ADMIN'), async (req, res) => {
  const { status } = req.body;
  try {
    const [rows] = await db.query(
      `SELECT a.patient_id, a.appointment_date, a.appointment_time 
       FROM appointments a WHERE a.appointment_id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    const appt = rows[0];

    await db.query('UPDATE appointments SET status = ? WHERE appointment_id = ?', [status, req.params.id]);

    let message = null;
    let type = 'info';
    if (status === 'Booked') {
      message = `✅ Your appointment on ${appt.appointment_date} at ${appt.appointment_time} has been APPROVED. Please arrive 15 minutes early.`;
      type = 'success';
    } else if (status === 'Cancelled') {
      message = `❌ Your appointment request on ${appt.appointment_date} at ${appt.appointment_time} was declined. Please book a new slot.`;
      type = 'warning';
    } else if (status === 'Completed') {
      message = `✅ Your visit on ${appt.appointment_date} has been marked as Completed. Thank you.`;
      type = 'info';
    }

    if (message) {
      await db.query(
        `INSERT INTO notifications (patient_id, message, type, related_appointment_id) VALUES (?, ?, ?, ?)`,
        [appt.patient_id, message, type, req.params.id]
      );
    }

    res.json({ message: 'Status updated', notification_sent: !!message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;























