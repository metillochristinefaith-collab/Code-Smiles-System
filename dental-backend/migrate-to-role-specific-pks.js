require('dotenv').config();
const db = require('./db');

async function migrateToRoleSpecificPKs() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    console.log('Creating staff and dentist tables with role-specific primary keys...\n');

    // Create staff table
    console.log('Creating staff table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        staff_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Created staff table');

    // Create dentist table
    console.log('Creating dentist table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS dentist (
        dentist_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Created dentist table');

    // Migrate staff data
    console.log('\nMigrating staff data...');
    const staffUsers = await client.query(
      `SELECT id, first_name, last_name FROM users WHERE role = 'Staff'`
    );

    for (const user of staffUsers.rows) {
      await client.query(
        `INSERT INTO staff (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      );
    }
    console.log(`✓ Migrated ${staffUsers.rows.length} staff members`);

    // Migrate dentist data
    console.log('Migrating dentist data...');
    const dentistUsers = await client.query(
      `SELECT id, first_name, last_name FROM users WHERE role = 'Dentist'`
    );

    for (const user of dentistUsers.rows) {
      await client.query(
        `INSERT INTO dentist (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      );
    }
    console.log(`✓ Migrated ${dentistUsers.rows.length} dentists`);

    // Update appointments table to use dentist_id from dentist table
    console.log('\nUpdating appointments table...');
    
    // First, add a temporary column to store the new dentist_id
    await client.query(`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS new_dentist_id INTEGER
    `);

    // Map old dentist_id (user_id) to new dentist_id from dentist table
    await client.query(`
      UPDATE appointments a
      SET new_dentist_id = d.dentist_id
      FROM dentist d
      WHERE a.dentist_id = d.user_id AND a.dentist_id IS NOT NULL
    `);

    // Drop the old foreign key constraint
    await client.query(`
      ALTER TABLE appointments 
      DROP CONSTRAINT IF EXISTS appointments_dentist_id_fkey
    `);

    // Drop the old dentist_id column
    await client.query(`
      ALTER TABLE appointments 
      DROP COLUMN dentist_id
    `);

    // Rename new_dentist_id to dentist_id
    await client.query(`
      ALTER TABLE appointments 
      RENAME COLUMN new_dentist_id TO dentist_id
    `);

    // Add new foreign key constraint
    await client.query(`
      ALTER TABLE appointments 
      ADD CONSTRAINT appointments_dentist_id_fkey 
      FOREIGN KEY (dentist_id) REFERENCES dentist(dentist_id) ON DELETE SET NULL
    `);

    console.log('✓ Updated appointments table');

    // Update treatment_plans table
    console.log('Updating treatment_plans table...');
    
    await client.query(`
      ALTER TABLE treatment_plans 
      ADD COLUMN IF NOT EXISTS new_dentist_id INTEGER
    `);

    await client.query(`
      UPDATE treatment_plans tp
      SET new_dentist_id = d.dentist_id
      FROM dentist d
      WHERE tp.dentist_id = d.user_id AND tp.dentist_id IS NOT NULL
    `);

    await client.query(`
      ALTER TABLE treatment_plans 
      DROP CONSTRAINT IF EXISTS treatment_plans_dentist_id_fkey
    `);

    await client.query(`
      ALTER TABLE treatment_plans 
      DROP COLUMN dentist_id
    `);

    await client.query(`
      ALTER TABLE treatment_plans 
      RENAME COLUMN new_dentist_id TO dentist_id
    `);

    await client.query(`
      ALTER TABLE treatment_plans 
      ADD CONSTRAINT treatment_plans_dentist_id_fkey 
      FOREIGN KEY (dentist_id) REFERENCES dentist(dentist_id) ON DELETE SET NULL
    `);

    console.log('✓ Updated treatment_plans table');

    // Update prescriptions table
    console.log('Updating prescriptions table...');
    
    await client.query(`
      ALTER TABLE prescriptions 
      ADD COLUMN IF NOT EXISTS new_dentist_id INTEGER
    `);

    await client.query(`
      UPDATE prescriptions p
      SET new_dentist_id = d.dentist_id
      FROM dentist d
      WHERE p.dentist_id = d.user_id AND p.dentist_id IS NOT NULL
    `);

    await client.query(`
      ALTER TABLE prescriptions 
      DROP CONSTRAINT IF EXISTS prescriptions_dentist_id_fkey
    `);

    await client.query(`
      ALTER TABLE prescriptions 
      DROP COLUMN dentist_id
    `);

    await client.query(`
      ALTER TABLE prescriptions 
      RENAME COLUMN new_dentist_id TO dentist_id
    `);

    await client.query(`
      ALTER TABLE prescriptions 
      ADD CONSTRAINT prescriptions_dentist_id_fkey 
      FOREIGN KEY (dentist_id) REFERENCES dentist(dentist_id) ON DELETE SET NULL
    `);

    console.log('✓ Updated prescriptions table');

    // Update clinical_notes table
    console.log('Updating clinical_notes table...');
    
    await client.query(`
      ALTER TABLE clinical_notes 
      ADD COLUMN IF NOT EXISTS new_dentist_id INTEGER
    `);

    await client.query(`
      UPDATE clinical_notes cn
      SET new_dentist_id = d.dentist_id
      FROM dentist d
      WHERE cn.dentist_id = d.user_id AND cn.dentist_id IS NOT NULL
    `);

    await client.query(`
      ALTER TABLE clinical_notes 
      DROP CONSTRAINT IF EXISTS clinical_notes_dentist_id_fkey
    `);

    await client.query(`
      ALTER TABLE clinical_notes 
      DROP COLUMN dentist_id
    `);

    await client.query(`
      ALTER TABLE clinical_notes 
      RENAME COLUMN new_dentist_id TO dentist_id
    `);

    await client.query(`
      ALTER TABLE clinical_notes 
      ADD CONSTRAINT clinical_notes_dentist_id_fkey 
      FOREIGN KEY (dentist_id) REFERENCES dentist(dentist_id) ON DELETE SET NULL
    `);

    console.log('✓ Updated clinical_notes table');

    // Remove old staff_id and dentist_id columns from users table
    console.log('\nCleaning up users table...');
    await client.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS staff_id,
      DROP COLUMN IF EXISTS dentist_id
    `);
    console.log('✓ Removed old staff_id and dentist_id columns from users table');

    await client.query('COMMIT');

    console.log('\n✅ Migration completed successfully!\n');

    // Show results
    const staffList = await db.query(`
      SELECT s.staff_id, u.id as user_id, u.first_name, u.last_name, u.email 
      FROM staff s 
      JOIN users u ON s.user_id = u.id 
      ORDER BY s.staff_id
    `);

    const dentistList = await db.query(`
      SELECT d.dentist_id, u.id as user_id, u.first_name, u.last_name, u.email 
      FROM dentist d 
      JOIN users u ON d.user_id = u.id 
      ORDER BY d.dentist_id
    `);

    console.log('Staff Members:');
    console.log('─'.repeat(80));
    staffList.rows.forEach(s => {
      console.log(`  Staff ID: ${s.staff_id} | User ID: ${s.user_id} | ${s.first_name} ${s.last_name} (${s.email})`);
    });

    console.log('\nDentists:');
    console.log('─'.repeat(80));
    dentistList.rows.forEach(d => {
      console.log(`  Dentist ID: ${d.dentist_id} | User ID: ${d.user_id} | ${d.first_name} ${d.last_name} (${d.email})`);
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrateToRoleSpecificPKs();
