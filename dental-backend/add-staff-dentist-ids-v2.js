require('dotenv').config();
const db = require('./db');

async function addStaffDentistIds() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Check if columns already exist
    const checkResult = await client.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'users' AND column_name IN ('staff_id', 'dentist_id')`
    );

    if (checkResult.rows.length > 0) {
      console.log('⚠️  Some columns already exist:');
      checkResult.rows.forEach(row => console.log(`  - ${row.column_name}`));
      
      // Drop them first
      for (const row of checkResult.rows) {
        await client.query(`ALTER TABLE users DROP COLUMN ${row.column_name}`);
        console.log(`✓ Dropped ${row.column_name}`);
      }
    }

    console.log('\nAdding staff_id and dentist_id columns to users table...\n');

    // Add staff_id column (for Staff role users) - NOT SERIAL, just INTEGER
    await client.query(
      `ALTER TABLE users ADD COLUMN staff_id INTEGER UNIQUE`
    );
    console.log('✓ Added staff_id column');

    // Add dentist_id column (for Admin role users) - NOT SERIAL, just INTEGER
    await client.query(
      `ALTER TABLE users ADD COLUMN dentist_id INTEGER UNIQUE`
    );
    console.log('✓ Added dentist_id column');

    // Populate staff_id for Staff role users
    const staffResult = await client.query(
      `SELECT id FROM users WHERE role = 'Staff' ORDER BY id`
    );
    
    let staffCounter = 1;
    for (const staff of staffResult.rows) {
      await client.query(
        `UPDATE users SET staff_id = $1 WHERE id = $2`,
        [staffCounter, staff.id]
      );
      staffCounter++;
    }
    console.log(`✓ Populated staff_id for ${staffResult.rows.length} staff members`);

    // Populate dentist_id for Admin role users (dentists)
    const dentistResult = await client.query(
      `SELECT id FROM users WHERE role = 'Admin' ORDER BY id`
    );
    
    let dentistCounter = 1;
    for (const dentist of dentistResult.rows) {
      await client.query(
        `UPDATE users SET dentist_id = $1 WHERE id = $2`,
        [dentistCounter, dentist.id]
      );
      dentistCounter++;
    }
    console.log(`✓ Populated dentist_id for ${dentistResult.rows.length} dentists`);

    await client.query('COMMIT');

    // Show results
    console.log('\n✅ Migration completed successfully!\n');
    
    const staffList = await db.query(
      `SELECT id, staff_id, first_name, last_name, email, role FROM users WHERE role = 'Staff' ORDER BY staff_id`
    );
    
    const dentistList = await db.query(
      `SELECT id, dentist_id, first_name, last_name, email, role FROM users WHERE role = 'Admin' ORDER BY dentist_id`
    );

    if (staffList.rows.length > 0) {
      console.log('Staff Members:');
      console.log('─'.repeat(80));
      staffList.rows.forEach(s => {
        console.log(`  Staff ID: ${s.staff_id} | User ID: ${s.id} | ${s.first_name} ${s.last_name} (${s.email})`);
      });
    }

    if (dentistList.rows.length > 0) {
      console.log('\nDentists:');
      console.log('─'.repeat(80));
      dentistList.rows.forEach(d => {
        console.log(`  Dentist ID: ${d.dentist_id} | User ID: ${d.id} | ${d.first_name} ${d.last_name} (${d.email})`);
      });
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

addStaffDentistIds();
