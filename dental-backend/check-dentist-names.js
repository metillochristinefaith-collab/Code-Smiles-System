/**
 * Check dentist names in database vs frontend format
 */

require('dotenv').config();
const db = require('./db');

async function checkDentistNames() {
  try {
    console.log('\n=== DENTISTS IN DATABASE ===\n');
    
    const result = await db.query(
      `SELECT id, first_name, last_name, email, role FROM users 
       WHERE role = 'Admin' 
       ORDER BY first_name`
    );

    result.rows.forEach(u => {
      const dbName = `${u.first_name} ${u.last_name}`;
      const frontendName = `Dr. ${u.first_name} ${u.last_name}`;
      console.log(`ID: ${u.id}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  DB Name: "${dbName}"`);
      console.log(`  Frontend Name: "${frontendName}"`);
      console.log('');
    });

    console.log('\n=== CHECKING APPOINTMENTS ===\n');
    
    const apptResult = await db.query(
      `SELECT id, patient_name, dentist_name, dentist_id, status, appointment_date
       FROM appointments 
       WHERE status = 'Approved'
       ORDER BY appointment_date DESC
       LIMIT 10`
    );

    console.log(`Found ${apptResult.rowCount} approved appointments:\n`);
    apptResult.rows.forEach(a => {
      console.log(`Appointment ID: ${a.id}`);
      console.log(`  Patient: ${a.patient_name}`);
      console.log(`  Stored dentist_name: "${a.dentist_name}"`);
      console.log(`  Stored dentist_id: ${a.dentist_id}`);
      console.log(`  Date: ${a.appointment_date}`);
      console.log('');
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkDentistNames();
