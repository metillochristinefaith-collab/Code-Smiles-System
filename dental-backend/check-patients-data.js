require('dotenv').config();
const db = require('./db');

async function checkPatientsData() {
  try {
    console.log('Checking patients data...\n');

    // Check patients data
    console.log('Patients records:');
    const patients = await db.query(`
      SELECT patient_id, user_id, first_name, last_name, email
      FROM patients
      LIMIT 10
    `);
    
    if (patients.rows.length > 0) {
      patients.rows.forEach(p => {
        console.log(`  - Patient ID: ${p.patient_id}, User ID: ${p.user_id}, Name: ${p.first_name} ${p.last_name}`);
      });
    } else {
      console.log('  No patients found');
    }

    // Check if user_id 3 has a patient record
    console.log('\nChecking if user_id 3 (Raphoncel) has a patient record...');
    const user3Patient = await db.query(`
      SELECT patient_id, user_id, first_name, last_name
      FROM patients
      WHERE user_id = 3
    `);
    
    if (user3Patient.rows.length > 0) {
      console.log(`  ✓ Found: Patient ID ${user3Patient.rows[0].patient_id}`);
    } else {
      console.log('  ✗ No patient record for user_id 3');
    }

    // Check if user_id 20 has a patient record
    console.log('\nChecking if user_id 20 has a patient record...');
    const user20Patient = await db.query(`
      SELECT patient_id, user_id, first_name, last_name
      FROM patients
      WHERE user_id = 20
    `);
    
    if (user20Patient.rows.length > 0) {
      console.log(`  ✓ Found: Patient ID ${user20Patient.rows[0].patient_id}`);
    } else {
      console.log('  ✗ No patient record for user_id 20');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkPatientsData();
