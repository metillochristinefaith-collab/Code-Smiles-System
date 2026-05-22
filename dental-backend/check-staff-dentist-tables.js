require('dotenv').config();
const db = require('./db');

async function checkStaffDentistTables() {
  try {
    console.log('═'.repeat(80));
    console.log('CHECKING STAFF AND DENTIST TABLES');
    console.log('═'.repeat(80));

    // Check staff table structure
    console.log('\n\n📋 STAFF TABLE STRUCTURE:');
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

    const staffDataResult = await db.query('SELECT * FROM staff');
    console.log(`\nData (${staffDataResult.rows.length} rows):`);
    console.log(JSON.stringify(staffDataResult.rows, null, 2));

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

    const dentistDataResult = await db.query('SELECT * FROM dentist');
    console.log(`\nData (${dentistDataResult.rows.length} rows):`);
    console.log(JSON.stringify(dentistDataResult.rows, null, 2));

    console.log('\n' + '═'.repeat(80));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkStaffDentistTables();
