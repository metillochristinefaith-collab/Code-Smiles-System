require('dotenv').config();
const db = require('./db');

async function checkAllPatientIds() {
  try {
    console.log('\n=== CHECKING ALL APPOINTMENTS FOR PATIENT_ID ===\n');
    
    const appts = await db.query(
      `SELECT dentist_name, COUNT(*) as total, 
              SUM(CASE WHEN patient_id IS NOT NULL THEN 1 ELSE 0 END) as with_patient_id,
              SUM(CASE WHEN patient_id IS NULL THEN 1 ELSE 0 END) as without_patient_id
       FROM appointments 
       WHERE status IN ('Approved', 'Completed')
       GROUP BY dentist_name
       ORDER BY dentist_name`
    );
    
    console.log('Appointments by dentist and patient_id status:\n');
    
    appts.rows.forEach(a => {
      console.log(`${a.dentist_name}`);
      console.log(`  Total: ${a.total}`);
      console.log(`  With patient_id: ${a.with_patient_id}`);
      console.log(`  Without patient_id (NULL): ${a.without_patient_id}`);
      console.log('');
    });
    
    // Check if there are any patients in the system
    console.log('\nChecking patient records in database:\n');
    
    const patients = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE role = 'Patient'`
    );
    
    console.log(`Total Patient accounts: ${patients.rows[0].count}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkAllPatientIds();
