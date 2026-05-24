require('dotenv').config();
const db = require('./db');

async function fixChristineMetillo() {
  const client = await db.connect();
  try {
    console.log('\n=== FIXING DR. CHRISTINE METILLO NAME MISMATCH ===\n');
    
    await client.query('BEGIN');
    
    // Find the correct dentist ID for Christine Metillo
    const dentistResult = await client.query(
      `SELECT id FROM users WHERE first_name = 'Christine' AND last_name = 'Metillo' AND role = 'Admin'`
    );
    
    if (dentistResult.rows.length === 0) {
      console.log('✗ Dr. Christine Metillo not found in users table');
      await client.query('ROLLBACK');
      process.exit(1);
    }
    
    const correctId = dentistResult.rows[0].id;
    console.log(`Found Dr. Christine Metillo with ID: ${correctId}\n`);
    
    // Update the appointment with the wrong name
    const updateResult = await client.query(
      `UPDATE appointments 
       SET dentist_name = 'Dr. Christine Metillo', dentist_id = $1
       WHERE dentist_name = 'Dr. Christine Faith Metillo'
       RETURNING id, patient_name, dentist_name, dentist_id`,
      [correctId]
    );
    
    console.log(`Updated ${updateResult.rowCount} appointment(s):\n`);
    updateResult.rows.forEach(row => {
      console.log(`  Appointment ${row.id}`);
      console.log(`  Patient: ${row.patient_name}`);
      console.log(`  Dentist: ${row.dentist_name} (ID: ${row.dentist_id})`);
    });
    
    await client.query('COMMIT');
    
    console.log('\n=== FINAL VERIFICATION ===\n');
    
    const verification = await db.query(
      `SELECT dentist_name, dentist_id, COUNT(*) as count 
       FROM appointments 
       WHERE status IN ('Approved', 'Completed')
       GROUP BY dentist_name, dentist_id
       ORDER BY dentist_name`
    );
    
    console.log('All appointments by dentist:\n');
    verification.rows.forEach(row => {
      console.log(`  "${row.dentist_name}" (ID: ${row.dentist_id}): ${row.count} appointments`);
    });
    
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

fixChristineMetillo();
