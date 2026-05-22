require('dotenv').config();
const db = require('./db');

async function findStaffDentistIds() {
  try {
    console.log('═'.repeat(80));
    console.log('SEARCHING FOR staff_id AND dentist_id COLUMNS');
    console.log('═'.repeat(80));

    // Check if staff_id and dentist_id exist in users table
    const result = await db.query(
      `SELECT column_name, ordinal_position, data_type
       FROM information_schema.columns
       WHERE table_name = 'users'
       AND (column_name = 'staff_id' OR column_name = 'dentist_id')
       ORDER BY ordinal_position`
    );

    if (result.rows.length === 0) {
      console.log('\n❌ staff_id and dentist_id columns NOT FOUND in users table');
      console.log('\nAll columns in users table:');
      
      const allColumns = await db.query(
        `SELECT column_name, ordinal_position, data_type
         FROM information_schema.columns
         WHERE table_name = 'users'
         ORDER BY ordinal_position`
      );

      allColumns.rows.forEach(col => {
        console.log(`  ${col.ordinal_position}. ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('\n✅ Found staff_id and dentist_id columns:');
      result.rows.forEach(col => {
        console.log(`  Position ${col.ordinal_position}: ${col.column_name} (${col.data_type})`);
      });
    }

    // Check all tables in the database
    console.log('\n\nAll tables in database:');
    console.log('─'.repeat(80));
    
    const tables = await db.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public'
       ORDER BY table_name`
    );

    tables.rows.forEach(t => {
      console.log(`  • ${t.table_name}`);
    });

    console.log('\n' + '═'.repeat(80));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

findStaffDentistIds();
