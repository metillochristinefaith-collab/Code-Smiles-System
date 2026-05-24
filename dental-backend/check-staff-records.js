require('dotenv').config();
const db = require('./db');

async function checkStaffRecords() {
  try {
    console.log('Checking staff records...\n');

    // Get all staff records
    const staffRecords = await db.query(`
      SELECT s.user_id, u.first_name, u.last_name, u.email, s.gender
      FROM staff s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.user_id
      LIMIT 10
    `);

    console.log('Staff records:');
    if (staffRecords.rows.length > 0) {
      staffRecords.rows.forEach(row => {
        console.log(`  User ID: ${row.user_id} | ${row.first_name} ${row.last_name} (${row.email}) | Gender: ${row.gender || 'NULL'}`);
      });
    } else {
      console.log('  No staff records found');
    }

    // Get all dentist records
    console.log('\nDentist records:');
    const dentistRecords = await db.query(`
      SELECT d.user_id, u.first_name, u.last_name, u.email, d.gender
      FROM dentist d
      JOIN users u ON d.user_id = u.id
      ORDER BY d.user_id
      LIMIT 10
    `);

    if (dentistRecords.rows.length > 0) {
      dentistRecords.rows.forEach(row => {
        console.log(`  User ID: ${row.user_id} | ${row.first_name} ${row.last_name} (${row.email}) | Gender: ${row.gender || 'NULL'}`);
      });
    } else {
      console.log('  No dentist records found');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkStaffRecords();
