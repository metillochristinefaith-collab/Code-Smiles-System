/**
 * migrate-staff-profiles.js
 * Populates the staff_profiles table from existing staff users
 * Run this ONCE after creating the staff_profiles table
 * Command: node migrate-staff-profiles.js
 */

require('dotenv').config();
const db = require('./db');

async function migrateStaffProfiles() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    console.log('Migrating staff profiles...\n');

    // Get all staff users
    const staffUsers = await client.query(
      `SELECT id, first_name, last_name FROM users WHERE role = 'Staff'`
    );

    console.log(`Found ${staffUsers.rows.length} staff members to migrate.\n`);

    let created = 0;
    let skipped = 0;

    for (const user of staffUsers.rows) {
      // Check if profile already exists
      const existing = await client.query(
        'SELECT id FROM staff_profiles WHERE user_id = $1',
        [user.id]
      );

      if (existing.rows.length > 0) {
        console.log(`⊘ Staff profile already exists for ${user.first_name} ${user.last_name} (ID: ${user.id})`);
        skipped++;
        continue;
      }

      // Create new staff profile with defaults
      await client.query(
        `INSERT INTO staff_profiles 
           (user_id, position, department, hire_date, work_schedule, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          'Front Desk Staff',
          'Administration',
          null,
          'Mon – Fri · 8:00 AM – 5:00 PM',
          'Active'
        ]
      );

      console.log(`✓ Created staff profile for ${user.first_name} ${user.last_name} (ID: ${user.id})`);
      created++;
    }

    await client.query('COMMIT');

    console.log(`\n✓ Migration complete!`);
    console.log(`  Created: ${created} new profiles`);
    console.log(`  Skipped: ${skipped} existing profiles`);
    console.log(`  Total:   ${created + skipped} staff members`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrateStaffProfiles();
