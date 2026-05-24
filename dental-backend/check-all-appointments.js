require('dotenv').config();
const db = require('./db');

async function checkAllAppointments() {
  try {
    console.log('Checking ALL appointments in database...\n');

    // Get all appointments
    const allAppointments = await db.query(`
      SELECT 
        id, patient_id, patient_name, treatment, services,
        appointment_date, appointment_time, status, confirmation_status,
        dentist_id, dentist_name, created_at
      FROM appointments
      ORDER BY appointment_date DESC, appointment_time DESC
      LIMIT 20
    `);

    console.log(`Total appointments found: ${allAppointments.rows.length}\n`);
    
    if (allAppointments.rows.length > 0) {
      allAppointments.rows.forEach((apt, idx) => {
        console.log(`${idx + 1}. ID: ${apt.id}`);
        console.log(`   Patient: ${apt.patient_name} (ID: ${apt.patient_id})`);
        console.log(`   Treatment: ${apt.treatment}`);
        console.log(`   Date: ${apt.appointment_date} at ${apt.appointment_time}`);
        console.log(`   Status: ${apt.status}`);
        console.log(`   Dentist: ${apt.dentist_name || 'Not assigned'} (ID: ${apt.dentist_id})`);
        console.log('');
      });
    }

    // Check today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`\nToday's date: ${today}`);

    // Check upcoming appointments (Approved status and date >= today)
    const upcoming = await db.query(`
      SELECT id, patient_id, patient_name, treatment, appointment_date, status
      FROM appointments
      WHERE status = 'Approved' AND appointment_date >= $1
      ORDER BY appointment_date ASC
    `, [today]);

    console.log(`\nUpcoming appointments (Approved + date >= today): ${upcoming.rows.length}`);
    if (upcoming.rows.length > 0) {
      upcoming.rows.forEach(apt => {
        console.log(`  - Patient ${apt.patient_name} (ID: ${apt.patient_id}): ${apt.treatment} on ${apt.appointment_date}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkAllAppointments();
