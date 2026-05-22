require('dotenv').config();
const db = require('./db');

async function checkUsersStructure() {
  try {
    console.log('═'.repeat(80));
    console.log('CURRENT USERS TABLE STRUCTURE');
    console.log('═'.repeat(80));

    // Get all columns
    const columnsResult = await db.query(
      `SELECT column_name, data_type, is_nullable, ordinal_position
       FROM information_schema.columns
       WHERE table_name = 'users'
       ORDER BY ordinal_position`
    );

    console.log('\nColumns in users table:\n');
    columnsResult.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  ${col.ordinal_position.toString().padEnd(2)} | ${col.column_name.padEnd(30)} | ${col.data_type.padEnd(20)} | ${nullable}`);
    });

    // Get sample data
    console.log('\n\nSample users data:\n');
    const dataResult = await db.query(
      `SELECT id, first_name, last_name, email, role FROM users LIMIT 5`
    );

    console.log('ID | First Name | Last Name | Email | Role');
    console.log('─'.repeat(80));
    dataResult.rows.forEach(row => {
      console.log(`${row.id} | ${row.first_name} | ${row.last_name} | ${row.email} | ${row.role}`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log('✅ STRUCTURE CHECK COMPLETE');
    console.log('═'.repeat(80));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkUsersStructure();
