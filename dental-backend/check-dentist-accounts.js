require('dotenv').config();
const db = require('./db');

async function checkDentists() {
  try {
    console.log('\n=== DENTIST ACCOUNTS IN DATABASE ===\n');
    
    const result = await db.query(
      `SELECT id, first_name, last_name, email, role, status FROM users WHERE role = 'Admin' ORDER BY first_name`
    );
    
    console.log(`Found ${result.rowCount} dentist accounts:\n`);
    result.rows.forEach(u => {
      const fullName = `Dr. ${u.first_name} ${u.last_name}`;
      console.log(`  ID: ${u.id}`);
      console.log(`  Name: ${fullName}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Status: ${u.status}`);
      console.log('');
    });

    // Now check appointments for each dentist
    console.log('\n=== APPOINTMENTS PER DENTIST ===\n');
    
    for (const dentist of result.rows) {
      const fullName = `Dr. ${dentist.first_name} ${dentist.last_name}`;
      const apptResult = await db.query(
        `SELECT COUNT(*) as count FROM appointments WHERE dentist_name = $1 AND status IN ('Approved', 'Completed')`,
        [fullName]
      );
      const count = apptResult.rows[0].count;
      console.log(`${fullName}: ${count} appointments`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkDentists();
