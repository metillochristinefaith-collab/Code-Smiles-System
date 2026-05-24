require('dotenv').config();
const db = require('./db');

async function debug() {
  try {
    console.log('Debugging appointments...\n');

    const today = new Date().toISOString().split('T')[0];
    console.log(`Today's date: ${today}\n`);

    // Get all appointments for patient_id 20
    const all = await db.query(`
      SELECT id, patient_name, treatment, appointment_date, status
      FROM appointments
      WHERE patient_id = 20
      ORDER BY appointment_date DESC
    `);

    console.log(`All appointments for patient_id 20: ${all.rows.length}`);
    all.rows.forEach(apt => {
      console.log(`  - ${apt.treatment} on ${apt.appointment_date} (${apt.status})`);
    });

    // Get approved appointments
    const approved = await db.query(`
      SELECT id, patient_name, treatment, appointment_date, status
      FROM appointments
      WHERE patient_id = 20 AND status = 'Approved'
      ORDER BY appointment_date DESC
    `);

    console.log(`\nApproved appointments: ${approved.rows.length}`);
    approved.rows.forEach(apt => {
      console.log(`  - ${apt.treatment} on ${apt.appointment_date}`);
    });

    // Get approved appointments >= today
    const upcoming = await db.query(`
      SELECT id, patient_name, treatment, appointment_date, status
      FROM appointments
      WHERE patient_id = 20 AND status = 'Approved' AND appointment_date >= $1
      ORDER BY appointment_date ASC
    `, [today]);

    console.log(`\nApproved appointments >= ${today}: ${upcoming.rows.length}`);
    upcoming.rows.forEach(apt => {
      console.log(`  - ${apt.treatment} on ${apt.appointment_date}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

debug();
