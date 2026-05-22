require('dotenv').config();
const db = require('./db');

async function reorganizeUsersColumns() {
  const client = await db.connect();
  try {
    console.log('═'.repeat(80));
    console.log('REORGANIZING USERS TABLE COLUMNS');
    console.log('═'.repeat(80));
    console.log('\nThis script will move staff_id and dentist_id to the correct position');
    console.log('(right after the main id column)\n');

    await client.query('BEGIN');

    // Step 1: Check current structure
    console.log('Step 1: Checking current column structure...');
    const currentStructure = await client.query(
      `SELECT column_name, ordinal_position 
       FROM information_schema.columns 
       WHERE table_name = 'users' 
       ORDER BY ordinal_position`
    );

    console.log('\nCurrent column order:');
    currentStructure.rows.forEach(col => {
      console.log(`  ${col.ordinal_position}. ${col.column_name}`);
    });

    // Step 2: Create a new table with correct column order
    console.log('\n\nStep 2: Creating new users table with correct column order...');
    
    await client.query(`
      CREATE TABLE users_new (
        id INTEGER NOT NULL DEFAULT nextval('users_id_seq'::regclass),
        staff_id INTEGER UNIQUE,
        dentist_id INTEGER UNIQUE,
        first_name CHARACTER VARYING NOT NULL,
        last_name CHARACTER VARYING NOT NULL,
        email CHARACTER VARYING NOT NULL,
        phone CHARACTER VARYING,
        password CHARACTER VARYING NOT NULL,
        role CHARACTER VARYING NOT NULL,
        status CHARACTER VARYING DEFAULT 'Active'::character varying,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
        specialty TEXT,
        avatar_url TEXT,
        is_verified BOOLEAN NOT NULL DEFAULT false,
        verification_token_expires_at TIMESTAMP WITHOUT TIME ZONE,
        verification_token CHARACTER VARYING,
        reset_token CHARACTER VARYING,
        reset_token_expires_at TIMESTAMP WITHOUT TIME ZONE,
        PRIMARY KEY (id)
      )
    `);
    console.log('✓ Created new users_new table');

    // Step 3: Copy data from old table to new table
    console.log('\nStep 3: Copying data from old table to new table...');
    
    await client.query(`
      INSERT INTO users_new (
        id, staff_id, dentist_id, first_name, last_name, email, phone, 
        password, role, status, created_at, specialty, avatar_url, 
        is_verified, verification_token_expires_at, verification_token, 
        reset_token, reset_token_expires_at
      )
      SELECT 
        id, staff_id, dentist_id, first_name, last_name, email, phone, 
        password, role, status, created_at, specialty, avatar_url, 
        is_verified, verification_token_expires_at, verification_token, 
        reset_token, reset_token_expires_at
      FROM users
    `);
    
    const copyResult = await client.query('SELECT COUNT(*) as count FROM users_new');
    console.log(`✓ Copied ${copyResult.rows[0].count} rows to new table`);

    // Step 4: Drop old constraints and foreign keys that reference users
    console.log('\nStep 4: Dropping old constraints...');
    
    // Drop foreign keys from other tables that reference users
    const fkResult = await client.query(`
      SELECT constraint_name, table_name
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name IN (
          'staff', 'dentist', 'patient_profiles', 'notifications',
          'support_requests', 'patient_vault_records', 'vault_file_sharing'
        )
    `);

    for (const fk of fkResult.rows) {
      try {
        await client.query(`ALTER TABLE ${fk.table_name} DROP CONSTRAINT ${fk.constraint_name}`);
        console.log(`✓ Dropped constraint: ${fk.constraint_name}`);
      } catch (err) {
        console.log(`⚠ Could not drop ${fk.constraint_name}: ${err.message}`);
      }
    }

    // Step 5: Rename tables
    console.log('\nStep 5: Renaming tables...');
    
    await client.query('ALTER TABLE users RENAME TO users_old');
    console.log('✓ Renamed old users table to users_old');
    
    await client.query('ALTER TABLE users_new RENAME TO users');
    console.log('✓ Renamed users_new to users');

    // Step 6: Recreate foreign keys
    console.log('\nStep 6: Recreating foreign keys...');
    
    await client.query(`
      ALTER TABLE staff 
      ADD CONSTRAINT staff_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
    console.log('✓ Recreated staff.user_id foreign key');

    await client.query(`
      ALTER TABLE dentist 
      ADD CONSTRAINT dentist_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
    console.log('✓ Recreated dentist.user_id foreign key');

    await client.query(`
      ALTER TABLE patient_profiles 
      ADD CONSTRAINT patient_profiles_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
    console.log('✓ Recreated patient_profiles.user_id foreign key');

    await client.query(`
      ALTER TABLE notifications 
      ADD CONSTRAINT notifications_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
    console.log('✓ Recreated notifications.user_id foreign key');

    await client.query(`
      ALTER TABLE support_requests 
      ADD CONSTRAINT support_requests_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
    console.log('✓ Recreated support_requests.user_id foreign key');

    await client.query(`
      ALTER TABLE patient_vault_records 
      ADD CONSTRAINT patient_vault_records_patient_id_fkey 
      FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
    `);
    console.log('✓ Recreated patient_vault_records.patient_id foreign key');

    await client.query(`
      ALTER TABLE vault_file_sharing 
      ADD CONSTRAINT vault_file_sharing_patient_id_fkey 
      FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
    `);
    console.log('✓ Recreated vault_file_sharing.patient_id foreign key');

    await client.query(`
      ALTER TABLE vault_file_sharing 
      ADD CONSTRAINT vault_file_sharing_shared_with_user_id_fkey 
      FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
    console.log('✓ Recreated vault_file_sharing.shared_with_user_id foreign key');

    // Step 7: Verify the new structure
    console.log('\nStep 7: Verifying new column structure...');
    
    const newStructure = await client.query(
      `SELECT column_name, ordinal_position 
       FROM information_schema.columns 
       WHERE table_name = 'users' 
       ORDER BY ordinal_position`
    );

    console.log('\nNew column order:');
    newStructure.rows.forEach(col => {
      console.log(`  ${col.ordinal_position}. ${col.column_name}`);
    });

    // Step 8: Verify data integrity
    console.log('\nStep 8: Verifying data integrity...');
    
    const oldCount = await client.query('SELECT COUNT(*) as count FROM users_old');
    const newCount = await client.query('SELECT COUNT(*) as count FROM users');
    
    if (oldCount.rows[0].count === newCount.rows[0].count) {
      console.log(`✓ Data count matches: ${newCount.rows[0].count} rows`);
    } else {
      throw new Error('Data count mismatch!');
    }

    // Step 9: Verify all users have correct data
    const dataCheck = await client.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE first_name IS NOT NULL 
        AND last_name IS NOT NULL 
        AND email IS NOT NULL
    `);
    console.log(`✓ All users have required fields: ${dataCheck.rows[0].count} rows`);

    await client.query('COMMIT');

    console.log('\n' + '═'.repeat(80));
    console.log('✅ REORGANIZATION COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(80));
    console.log('\nSummary:');
    console.log('  ✓ Moved staff_id to position 2');
    console.log('  ✓ Moved dentist_id to position 3');
    console.log('  ✓ All data preserved');
    console.log('  ✓ All foreign keys recreated');
    console.log('  ✓ Data integrity verified');
    console.log('\nOld table (users_old) is kept as backup.');
    console.log('You can delete it after verifying everything works.\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERROR:', err.message);
    console.error('\nStack:', err.stack);
    console.error('\n⚠️  Transaction rolled back. No changes were made.');
  } finally {
    client.release();
    process.exit(0);
  }
}

reorganizeUsersColumns();
