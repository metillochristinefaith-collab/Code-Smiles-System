require('dotenv').config();
const db = require('./db');

async function checkPatientTables() {
  try {
    const result = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%patient%'
      ORDER BY table_name
    `);
    console.log('Patient-related tables:');
    result.rows.forEach(row => console.log('  -', row.table_name));
    
    // Check if there's a link between users and patient_id
    console.log('\nChecking users table for patient_id column...');
    const usersSchema = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name LIKE '%patient%'
    `);
    
    if (usersSchema.rows.length > 0) {
      console.log('Found patient-related columns in users table:');
      usersSchema.rows.forEach(row => console.log('  -', row.column_name));
    } else {
      console.log('No patient-related columns in users table');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkPatientTables();
