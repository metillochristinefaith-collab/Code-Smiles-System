require('dotenv').config();
const db = require('./db');

async function checkPatientId() {
  try {
    console.log('\n=== CHECKING PATIENT_ID IN APPOINTMENTS ===\n');
    
    const dentistName = 'Dr. Raphoncel Eduria';
    
    const appts = await db.query(
      `SELECT id, patient_id, patient_name, dentist_name, status FROM appointments WHERE dentist_name = $1 ORDER BY id`,
      [dentistName]
    );
    
    console.log(`Appointments for ${dentistName}:\n`);
    
    appts.rows.forEach(a => {
      console.log(`  ID: ${a.id}`);
      console.log(`  patient_id: ${a.patient_id} ${a.patient_id === null ? '❌ NULL' : '✓'}`);
      console.log(`  patient_name: ${a.patient_name}`);
      console.log(`  status: ${a.status}`);
      console.log('');
    });
    
    // Check the query that counts patients
    console.log('\nTesting patient count query:\n');
    
    const patientCount = await db.query(
      `SELECT COUNT(DISTINCT patient_id) FROM appointments WHERE patient_id IS NOT NULL AND dentist_name = $1`,
      [dentistName]
    );
    
    console.log(`Patients (with patient_id IS NOT NULL): ${patientCount.rows[0].count}`);
    
    // Check without the IS NOT NULL filter
    const patientCountAll = await db.query(
      `SELECT COUNT(DISTINCT patient_id) FROM appointments WHERE dentist_name = $1`,
      [dentistName]
    );
    
    console.log(`Patients (all, including NULL): ${patientCountAll.rows[0].count}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkPatientId();
