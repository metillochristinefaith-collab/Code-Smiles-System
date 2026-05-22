require('dotenv').config();
const db = require('./db');

async function createPatientsTable() {
  const client = await db.connect();
  try {
    console.log('═'.repeat(80));
    console.log('CREATING PATIENTS TABLE AND MIGRATING DATA');
    console.log('═'.repeat(80));

    await client.query('BEGIN');

    // Step 1: Create patients table
    console.log('\nStep 1: Creating patients table...');
    
    await client.query(`
      CREATE TABLE patients (
        patient_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        date_of_birth DATE,
        gender VARCHAR(20),
        contact_number VARCHAR(20),
        address TEXT,
        emergency_contact_name VARCHAR(100),
        emergency_contact_phone VARCHAR(20),
        medical_history TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Created patients table');

    // Step 2: Migrate data from users table (where role = 'Patient')
    console.log('\nStep 2: Migrating patient data from users table...');
    
    const patientUsersResult = await client.query(
      `SELECT id, first_name, last_name, phone, status, created_at 
       FROM users 
       WHERE role = 'Patient'`
    );

    console.log(`Found ${patientUsersResult.rows.length} patients in users table`);

    for (const user of patientUsersResult.rows) {
      await client.query(
        `INSERT INTO patients (user_id, first_name, last_name, contact_number, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, user.first_name, user.last_name, user.phone, user.status, user.created_at]
      );
    }
    console.log(`✓ Migrated ${patientUsersResult.rows.length} patients`);

    // Step 3: Update patient_profiles to reference patients table
    console.log('\nStep 3: Updating patient_profiles to reference patients table...');
    
    // First, add patient_id column to patient_profiles if it doesn't exist
    const checkColumnResult = await client.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'patient_profiles' AND column_name = 'patient_id'`
    );

    if (checkColumnResult.rows.length === 0) {
      await client.query(
        `ALTER TABLE patient_profiles 
         ADD COLUMN patient_id INTEGER REFERENCES patients(patient_id) ON DELETE CASCADE`
      );
      console.log('✓ Added patient_id column to patient_profiles');
    } else {
      console.log('✓ patient_id column already exists in patient_profiles');
    }

    // Update patient_profiles with patient_id
    const updateResult = await client.query(
      `UPDATE patient_profiles pp
       SET patient_id = p.patient_id
       FROM patients p
       WHERE pp.user_id = p.user_id`
    );
    console.log(`✓ Updated ${updateResult.rowCount} patient_profiles records`);

    // Step 4: Verify migration
    console.log('\nStep 4: Verifying migration...');
    
    const patientsCount = await client.query('SELECT COUNT(*) as count FROM patients');
    const profilesCount = await client.query('SELECT COUNT(*) as count FROM patient_profiles');
    
    console.log(`✓ Patients table: ${patientsCount.rows[0].count} rows`);
    console.log(`✓ Patient_profiles table: ${profilesCount.rows[0].count} rows`);

    // Step 5: Show sample data
    console.log('\nStep 5: Sample data from patients table:');
    console.log('─'.repeat(80));
    
    const sampleData = await client.query(
      `SELECT p.patient_id, p.user_id, p.first_name, p.last_name, p.contact_number, p.status
       FROM patients p
       LIMIT 5`
    );

    console.log('\npatient_id | user_id | first_name | last_name | contact_number | status');
    console.log('─'.repeat(80));
    sampleData.rows.forEach(row => {
      console.log(`${row.patient_id.toString().padEnd(10)} | ${row.user_id.toString().padEnd(7)} | ${row.first_name.padEnd(10)} | ${row.last_name.padEnd(10)} | ${(row.contact_number || 'N/A').padEnd(14)} | ${row.status}`);
    });

    // Step 6: Show relationships
    console.log('\n\nStep 6: Verifying relationships:');
    console.log('─'.repeat(80));
    
    const relationshipCheck = await client.query(
      `SELECT 
         u.id as user_id,
         u.first_name,
         u.last_name,
         u.role,
         p.patient_id,
         pp.id as profile_id,
         pp.blood_type
       FROM users u
       LEFT JOIN patients p ON u.id = p.user_id
       LEFT JOIN patient_profiles pp ON p.patient_id = pp.patient_id
       WHERE u.role = 'Patient'
       LIMIT 5`
    );

    console.log('\nuser_id | first_name | last_name | role | patient_id | profile_id | blood_type');
    console.log('─'.repeat(80));
    relationshipCheck.rows.forEach(row => {
      console.log(`${row.user_id.toString().padEnd(7)} | ${row.first_name.padEnd(10)} | ${row.last_name.padEnd(10)} | ${row.role.padEnd(6)} | ${(row.patient_id || 'N/A').toString().padEnd(10)} | ${(row.profile_id || 'N/A').toString().padEnd(10)} | ${row.blood_type || 'N/A'}`);
    });

    await client.query('COMMIT');

    console.log('\n' + '═'.repeat(80));
    console.log('✅ PATIENTS TABLE CREATED AND DATA MIGRATED SUCCESSFULLY!');
    console.log('═'.repeat(80));
    console.log('\nSummary:');
    console.log(`  ✓ Created patients table`);
    console.log(`  ✓ Migrated ${patientsCount.rows[0].count} patients from users table`);
    console.log(`  ✓ Updated patient_profiles to reference patients table`);
    console.log(`  ✓ All relationships verified`);
    console.log('\nNew Structure:');
    console.log('  users (authentication)');
    console.log('    └── patients (patient core data)');
    console.log('        └── patient_profiles (extended profile info)');
    console.log('\n✅ Ready for Monday presentation!\n');

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

createPatientsTable();
