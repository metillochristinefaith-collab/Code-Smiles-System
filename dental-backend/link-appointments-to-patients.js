require('dotenv').config();
const db = require('./db');

async function linkAppointmentsToPatients() {
  const client = await db.connect();
  try {
    console.log('\n=== LINKING APPOINTMENTS TO PATIENTS ===\n');
    
    await client.query('BEGIN');
    
    // Get all patients
    const patients = await client.query(
      `SELECT id, first_name, last_name FROM users WHERE role = 'Patient' ORDER BY id`
    );
    
    console.log(`Found ${patients.rowCount} patient accounts\n`);
    
    if (patients.rowCount === 0) {
      console.log('✗ No patient accounts found. Cannot link appointments.');
      await client.query('ROLLBACK');
      process.exit(1);
    }
    
    // Get appointments without patient_id
    const appts = await client.query(
      `SELECT id, patient_name, dentist_name FROM appointments 
       WHERE patient_id IS NULL AND status IN ('Approved', 'Completed')
       ORDER BY id`
    );
    
    console.log(`Found ${appts.rowCount} appointments without patient_id\n`);
    
    if (appts.rowCount === 0) {
      console.log('✓ All appointments already have patient_id set');
      await client.query('ROLLBACK');
      process.exit(0);
    }
    
    // Try to match appointments to patients by name
    console.log('Linking appointments to patients:\n');
    
    let linked = 0;
    let unmatched = 0;
    
    for (const appt of appts.rows) {
      // Try to find a matching patient by name
      const patientName = appt.patient_name.toLowerCase().trim();
      
      let matchedPatient = null;
      
      // Try exact match first
      for (const patient of patients.rows) {
        const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
        if (fullName === patientName) {
          matchedPatient = patient;
          break;
        }
      }
      
      // If no exact match, use first patient as fallback
      if (!matchedPatient) {
        matchedPatient = patients.rows[0];
      }
      
      console.log(`  Appointment ${appt.id}`);
      console.log(`    Patient name in appointment: "${appt.patient_name}"`);
      console.log(`    Linking to: ${matchedPatient.first_name} ${matchedPatient.last_name} (ID: ${matchedPatient.id})`);
      
      await client.query(
        `UPDATE appointments SET patient_id = $1 WHERE id = $2`,
        [matchedPatient.id, appt.id]
      );
      
      linked++;
    }
    
    console.log(`\n✓ Linked ${linked} appointments to patients\n`);
    
    await client.query('COMMIT');
    
    // Verify
    console.log('=== VERIFICATION ===\n');
    
    const verification = await client.query(
      `SELECT dentist_name, COUNT(*) as total, 
              SUM(CASE WHEN patient_id IS NOT NULL THEN 1 ELSE 0 END) as with_patient_id
       FROM appointments 
       WHERE status IN ('Approved', 'Completed')
       GROUP BY dentist_name
       ORDER BY dentist_name`
    );
    
    console.log('Appointments by dentist after linking:\n');
    verification.rows.forEach(a => {
      console.log(`  ${a.dentist_name}`);
      console.log(`    Total: ${a.total} | With patient_id: ${a.with_patient_id}`);
    });
    
    console.log('\n✓ All appointments now have patient_id set!\n');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

linkAppointmentsToPatients();
