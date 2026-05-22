require('dotenv').config();
const db = require('./db');

async function checkPatientsDetails() {
  try {
    console.log('═'.repeat(80));
    console.log('CHECKING PATIENTS TABLE DETAILS');
    console.log('═'.repeat(80));

    // Check patients table structure
    console.log('\n📋 PATIENTS TABLE STRUCTURE:');
    console.log('─'.repeat(80));
    
    const columnsResult = await db.query(
      `SELECT column_name, data_type, ordinal_position
       FROM information_schema.columns
       WHERE table_name = 'patients'
       ORDER BY ordinal_position`
    );

    console.log('\nColumns:');
    columnsResult.rows.forEach(col => {
      console.log(`  ${col.ordinal_position}. ${col.column_name} (${col.data_type})`);
    });

    // Check what's in users table for patients
    console.log('\n\n📋 DATA IN USERS TABLE (for patients):');
    console.log('─'.repeat(80));
    
    const usersDataResult = await db.query(
      `SELECT id, first_name, last_name, email, phone, specialty, avatar_url, status
       FROM users
       WHERE role = 'Patient'
       LIMIT 5`
    );

    console.log('\nid | first_name | last_name | email | phone | specialty | avatar_url | status');
    console.log('─'.repeat(80));
    usersDataResult.rows.forEach(row => {
      console.log(`${row.id} | ${row.first_name} | ${row.last_name} | ${row.email} | ${row.phone} | ${row.specialty || 'N/A'} | ${row.avatar_url ? 'YES' : 'NO'} | ${row.status}`);
    });

    // Check what's in patients table
    console.log('\n\n📋 DATA IN PATIENTS TABLE:');
    console.log('─'.repeat(80));
    
    const patientsDataResult = await client.query(
      `SELECT patient_id, user_id, first_name, last_name, contact_number, status
       FROM patients
       LIMIT 5`
    );

    console.log('\npatient_id | user_id | first_name | last_name | contact_number | status');
    console.log('─'.repeat(80));
    patientsDataResult.rows.forEach(row => {
      console.log(`${row.patient_id} | ${row.user_id} | ${row.first_name} | ${row.last_name} | ${row.contact_number} | ${row.status}`);
    });

    // Check what's missing
    console.log('\n\n⚠️  MISSING COLUMNS IN PATIENTS TABLE:');
    console.log('─'.repeat(80));
    console.log('  • email (should be migrated from users)');
    console.log('  • avatar_url (should be migrated from users)');
    console.log('  • specialty (should be migrated from users)');

    console.log('\n' + '═'.repeat(80));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkPatientsDetails();
