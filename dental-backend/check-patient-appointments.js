require('dotenv').config();
const db = require('./db');

async function checkAppointments() {
  try {
    console.log('Checking patient appointments...\n');

    // Get all appointments for patient (user_id = 3 - Raphoncel Eduria)
    const appointments = await db.query(`
      SELECT 
        id, patient_id, patient_name, treatment, services,
        appointment_date, appointment_time, status, confirmation_status,
        dentist_name, created_at, updated_at
      FROM appointments
      WHERE patient_id = 3
      ORDER BY appointment_date DESC, appointment_time DESC
    `);

    console.log(`Found ${appointments.rows.length} appointments for patient ID 3:\n`);
    
    if (appointments.rows.length > 0) {
      appointments.rows.forEach((apt, idx) => {
        console.log(`${idx + 1}. ${apt.treatment || apt.services}`);
        console.log(`   Date: ${apt.appointment_date} at ${apt.appointment_time}`);
        console.log(`   Status: ${apt.status}`);
        console.log(`   Confirmation: ${apt.confirmation_status}`);
        console.log(`   Dentist: ${apt.dentist_name || 'Not assigned'}`);
        console.log('');
      });
    } else {
      console.log('No appointments found for this patient.');
    }

    // Check today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`\nToday's date: ${today}`);

    // Check upcoming appointments (Approved status and date >= today)
    const upcoming = await db.query(`
      SELECT id, patient_name, treatment, appointment_date, status
      FROM appointments
      WHERE patient_id = 3 AND status = 'Approved' AND appointment_date >= $1
      ORDER BY appointment_date ASC
    `, [today]);

    console.log(`\nUpcoming appointments (Approved + date >= today): ${upcoming.rows.length}`);
    if (upcoming.rows.length > 0) {
      upcoming.rows.forEach(apt => {
        console.log(`  - ${apt.treatment} on ${apt.appointment_date} (${apt.status})`);
      });
    }

    // Check pending appointments
    const pending = await db.query(`
      SELECT id, patient_name, treatment, appointment_date, status
      FROM appointments
      WHERE patient_id = 3 AND status = 'Pending'
      ORDER BY appointment_date ASC
    `);

    console.log(`\nPending appointments (awaiting approval): ${pending.rows.length}`);
    if (pending.rows.length > 0) {
      pending.rows.forEach(apt => {
        console.log(`  - ${apt.treatment} on ${apt.appointment_date} (${apt.status})`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkAppointments();
