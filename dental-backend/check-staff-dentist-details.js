require('dotenv').config();
const db = require('./db');

async function checkStaffDentistDetails() {
  try {
    console.log('═'.repeat(80));
    console.log('CHECKING STAFF AND DENTIST TABLE DETAILS');
    console.log('═'.repeat(80));

    // Check staff table structure
    console.log('\n📋 STAFF TABLE STRUCTURE:');
    console.log('─'.repeat(80));
    
    const staffColumnsResult = await db.query(
      `SELECT column_name, data_type, ordinal_position
       FROM information_schema.columns
       WHERE table_name = 'staff'
       ORDER BY ordinal_position`
    );

    console.log('\nColumns:');
    staffColumnsResult.rows.forEach(col => {
      console.log(`  ${col.ordinal_position}. ${col.column_name} (${col.data_type})`);
    });

    // Check staff data
    const staffDataResult = await db.query(
      `SELECT s.staff_id, s.user_id, u.first_name, u.last_name, u.email, u.phone, u.status
       FROM staff s
       JOIN users u ON s.user_id = u.id`
    );

    console.log(`\nData (${staffDataResult.rows.length} rows):`);
    staffDataResult.rows.forEach(row => {
      console.log(`  Staff ID: ${row.staff_id}, User ID: ${row.user_id}, Name: ${row.first_name} ${row.last_name}, Email: ${row.email}`);
    });

    // Check dentist table structure
    console.log('\n\n📋 DENTIST TABLE STRUCTURE:');
    console.log('─'.repeat(80));
    
    const dentistColumnsResult = await db.query(
      `SELECT column_name, data_type, ordinal_position
       FROM information_schema.columns
       WHERE table_name = 'dentist'
       ORDER BY ordinal_position`
    );

    console.log('\nColumns:');
    dentistColumnsResult.rows.forEach(col => {
      console.log(`  ${col.ordinal_position}. ${col.column_name} (${col.data_type})`);
    });

    // Check dentist data
    const dentistDataResult = await db.query(
      `SELECT d.dentist_id, d.user_id, u.first_name, u.last_name, u.email, u.phone, u.specialty, u.status
       FROM dentist d
       JOIN users u ON d.user_id = u.id`
    );

    console.log(`\nData (${dentistDataResult.rows.length} rows):`);
    dentistDataResult.rows.forEach(row => {
      console.log(`  Dentist ID: ${row.dentist_id}, User ID: ${row.user_id}, Name: ${row.first_name} ${row.last_name}, Email: ${row.email}, Specialty: ${row.specialty || 'N/A'}`);
    });

    // Show what's missing
    console.log('\n\n⚠️  MISSING COLUMNS:');
    console.log('─'.repeat(80));
    console.log('\nSTAFF TABLE needs:');
    console.log('  • first_name');
    console.log('  • last_name');
    console.log('  • email');
    console.log('  • phone');
    console.log('  • position (receptionist, assistant, admin, etc.)');
    console.log('  • department (front desk, clinical, admin, etc.)');
    console.log('  • permissions (what they can do)');
    console.log('  • hire_date');
    console.log('  • status');
    console.log('  • avatar_url');

    console.log('\nDENTIST TABLE needs:');
    console.log('  • first_name');
    console.log('  • last_name');
    console.log('  • email');
    console.log('  • phone');
    console.log('  • specialization (General Dentistry, Orthodontics, etc.)');
    console.log('  • license_number');
    console.log('  • years_experience');
    console.log('  • bio');
    console.log('  • working_days (Mon, Tue, Wed, etc.)');
    console.log('  • start_time (08:00)');
    console.log('  • end_time (17:00)');
    console.log('  • status');
    console.log('  • avatar_url');

    console.log('\n' + '═'.repeat(80));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkStaffDentistDetails();
