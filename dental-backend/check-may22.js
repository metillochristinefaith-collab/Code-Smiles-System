#!/usr/bin/env node
require('dotenv').config();
const db = require('./db');

async function check() {
  try {
    const result = await db.query(
      `SELECT id, patient_name, appointment_time, treatment, status, dentist_name
       FROM appointments 
       WHERE appointment_date = '2026-05-22'
       ORDER BY appointment_time ASC`
    );
    
    console.log(`Appointments on 2026-05-22: ${result.rows.length}`);
    result.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.patient_name} at ${row.appointment_time} (${row.treatment}, ${row.status}, Dentist: ${row.dentist_name})`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
