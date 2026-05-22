require('dotenv').config();
const db = require('./db');

async function checkPKSchema() {
  try {
    // Check primary keys
    const pkResult = await db.query(
      `SELECT constraint_name, column_name 
       FROM information_schema.key_column_usage 
       WHERE table_name = 'users' AND constraint_type = 'PRIMARY KEY'`
    );
    
    console.log('Current Primary Keys in users table:');
    console.log('─'.repeat(80));
    pkResult.rows.forEach(row => {
      console.log(`  ${row.constraint_name}: ${row.column_name}`);
    });

    // Check unique constraints
    const uniqueResult = await db.query(
      `SELECT constraint_name, column_name 
       FROM information_schema.key_column_usage 
       WHERE table_name = 'users' AND constraint_type = 'UNIQUE'`
    );
    
    console.log('\nCurrent Unique Constraints in users table:');
    console.log('─'.repeat(80));
    uniqueResult.rows.forEach(row => {
      console.log(`  ${row.constraint_name}: ${row.column_name}`);
    });

    // Show current data
    console.log('\n\nCurrent users with staff_id and dentist_id:');
    console.log('─'.repeat(80));
    const dataResult = await db.query(
      `SELECT id, staff_id, dentist_id, first_name, last_name, role FROM users ORDER BY id`
    );
    
    dataResult.rows.forEach(row => {
      console.log(`  ID: ${row.id} | Staff ID: ${row.staff_id} | Dentist ID: ${row.dentist_id} | ${row.first_name} ${row.last_name} (${row.role})`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkPKSchema();
