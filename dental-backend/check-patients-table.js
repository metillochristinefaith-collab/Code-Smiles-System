require('dotenv').config();
const db = require('./db');

async function checkPatientsTable() {
  try {
    console.log('Checking patients table structure...\n');
    
    const schema = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'patients'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in patients table:');
    schema.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'}`);
    });

    // Check patients data
    console.log('\nPatients records:');
    const patients = await db.query(`
      SELECT id, user_id, first_name, last_name, email
      FROM patients
      LIMIT 10
    `);
    
    if (patients.rows.length > 0) {
      patients.rows.forEach(p => {
        console.log(`  - ID: ${p.id}, User ID: ${p.user_id}, Name: ${p.first_name} ${p.last_name}`);
      });
    } else {
      console.log('  No patients found');
    }

    // Check if user_id 3 has a patient record
    console.log('\nChecking if user_id 3 (Raphoncel) has a patient record...');
    const user3Patient = await db.query(`
      SELECT id, user_id, first_name, last_name
      FROM patients
      WHERE user_id = 3
    `);
    
    if (user3Patient.rows.length > 0) {
      console.log(`  ✓ Found: Patient ID ${user3Patient.rows[0].id}`);
    } else {
      console.log('  ✗ No patient record for user_id 3');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkPatientsTable();
