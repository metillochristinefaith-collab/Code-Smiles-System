require('dotenv').config();
const db = require('./db');

async function fixChristineMetillo() {
  const client = await db.connect();
  try {
    console.log('\n=== FIXING DR. CHRISTINE FAITH METILLO APPOINTMENT ===\n');
    
    await client.query('BEGIN');
    
    // Find the appointment with the wrong dentist name
    const appt = await client.query(
      `SELECT id, patient_name, dentist_name FROM appointments 
       WHERE dentist_name = 'Dr. Christine Faith Metillo'`
    );
    
    if (appt.rows.length === 0) {
      console.log('No appointments found with "Dr. Christine Faith Metillo"');
      await client.query('ROLLBACK');
      process.exit(0);
    }
    
    console.log(`Found ${appt.rows.length} appointment(s) with wrong dentist name:\n`);
    appt.rows.forEach(a => {
      console.log(`  Appointment ${a.id}: Patient ${a.patient_name}, Dentist: "${a.dentist_name}"`);
    });
    
    // Get the correct dentist ID for Christine Metillo
    const correctDentist = await client.query(
      `SELECT id FROM users WHERE first_name = 'Christine' AND last_name = 'Metillo' AND role = 'Admin'`
    );
    
    if (correctDentist.rows.length === 0) {
      console.log('\n✗ Dr. Christine Metillo not found in users table');
      await client.query('ROLLBACK');
      process.exit(1);
    }
    
    const correctId = correctDentist.rows[0].id;
    console.log(`\nFound Dr. Christine Metillo with user_id: ${correctId}\n`);
    
    // Update the appointment
    const updated = await client.query(
      `UPDATE appointments 
       SET dentist_name = 'Dr. Christine Metillo', dentist_id = $1
       WHERE dentist_name = 'Dr. Christine Faith Metillo'
       RETURNING id, patient_name, dentist_name, dentist_id`,
      [correctId]
    );
    
    console.log(`Updated ${updated.rowCount} appointment(s):\n`);
    updated.rows.forEach(a => {
      console.log(`  Appointment ${a.id}`);
      console.log(`  Patient: ${a.patient_name}`);
      console.log(`  Dentist: ${a.dentist_name} (ID: ${a.dentist_id})`);
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
    
    console.log('\n✓ All dentist data is now synced!\n');
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
