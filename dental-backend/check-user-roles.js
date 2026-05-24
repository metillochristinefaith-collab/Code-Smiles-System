require('dotenv').config();
const db = require('./db');

async function checkUserRoles() {
  try {
    console.log('Checking user roles and patient links...\n');

    // Get all users with their roles
    const users = await db.query(`
      SELECT u.id, u.first_name, u.last_name, u.role, u.email
      FROM users u
      WHERE u.first_name LIKE '%Raphoncel%' OR u.first_name LIKE '%Ralph%'
      ORDER BY u.id
    `);

    console.log('Users with "Raphoncel" or "Ralph" in name:');
    users.rows.forEach(u => {
      console.log(`  - User ID: ${u.id}, Name: ${u.first_name} ${u.last_name}, Role: ${u.role}, Email: ${u.email}`);
    });

    // Check patient records
    console.log('\nPatient records with "Raphoncel" or "Ralph" in name:');
    const patients = await db.query(`
      SELECT patient_id, user_id, first_name, last_name
      FROM patients
      WHERE first_name LIKE '%Raphoncel%' OR first_name LIKE '%Ralph%'
      ORDER BY patient_id
    `);

    patients.rows.forEach(p => {
      console.log(`  - Patient ID: ${p.patient_id}, User ID: ${p.user_id}, Name: ${p.first_name} ${p.last_name}`);
    });

    // Check appointments for patient_id 3
    console.log('\nAppointments for Patient ID 3:');
    const appointments = await db.query(`
      SELECT id, patient_name, treatment, appointment_date, status
      FROM appointments
      WHERE patient_id = 3
      ORDER BY appointment_date DESC
      LIMIT 5
    `);

    if (appointments.rows.length > 0) {
      appointments.rows.forEach(apt => {
        console.log(`  - ${apt.treatment} on ${apt.appointment_date} (${apt.status})`);
      });
    } else {
      console.log('  No appointments found');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkUserRoles();
