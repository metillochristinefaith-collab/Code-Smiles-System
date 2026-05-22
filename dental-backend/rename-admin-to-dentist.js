require('dotenv').config();
const db = require('./db');

async function renameAdminToDentist() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    console.log('Renaming "Admin" role to "Dentist"...\n');

    // Update all Admin roles to Dentist
    const result = await client.query(
      `UPDATE users SET role = 'Dentist' WHERE role = 'Admin' RETURNING id, first_name, last_name, email, role, dentist_id`
    );

    await client.query('COMMIT');

    console.log(`✅ Updated ${result.rows.length} users from "Admin" to "Dentist"\n`);

    console.log('Updated Dentists:');
    console.log('─'.repeat(80));
    result.rows.forEach(d => {
      console.log(`  Dentist ID: ${d.dentist_id} | User ID: ${d.id} | ${d.first_name} ${d.last_name} (${d.email})`);
    });

    // Verify the change
    console.log('\n\nVerifying all roles in database:');
    console.log('─'.repeat(80));
    
    const allRoles = await db.query(
      `SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role`
    );

    allRoles.rows.forEach(row => {
      console.log(`  ${row.role}: ${row.count} users`);
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

renameAdminToDentist();
