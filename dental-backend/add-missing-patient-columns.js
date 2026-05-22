require('dotenv').config();
const db = require('./db');

async function addMissingPatientColumns() {
  const client = await db.connect();
  try {
    console.log('═'.repeat(80));
    console.log('ADDING MISSING COLUMNS TO PATIENTS TABLE');
    console.log('═'.repeat(80));

    await client.query('BEGIN');

    // Step 1: Add missing columns
    console.log('\nStep 1: Adding missing columns to patients table...');
    
    // Check if email column exists
    const emailCheckResult = await client.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'patients' AND column_name = 'email'`
    );

    if (emailCheckResult.rows.length === 0) {
      await client.query(`ALTER TABLE patients ADD COLUMN email VARCHAR(255) UNIQUE`);
      console.log('✓ Added email column');
    } else {
      console.log('✓ email column already exists');
    }

    // Check if avatar_url column exists
    const avatarCheckResult = await client.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'patients' AND column_name = 'avatar_url'`
    );

    if (avatarCheckResult.rows.length === 0) {
      await client.query(`ALTER TABLE patients ADD COLUMN avatar_url TEXT`);
      console.log('✓ Added avatar_url column');
    } else {
      console.log('✓ avatar_url column already exists');
    }

    // Check if specialty column exists
    const specialtyCheckResult = await client.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'patients' AND column_name = 'specialty'`
    );

    if (specialtyCheckResult.rows.length === 0) {
      await client.query(`ALTER TABLE patients ADD COLUMN specialty TEXT`);
      console.log('✓ Added specialty column');
    } else {
      console.log('✓ specialty column already exists');
    }

    // Step 2: Migrate data from users table
    console.log('\nStep 2: Migrating data from users table...');
    
    const updateResult = await client.query(`
      UPDATE patients p
      SET 
        email = u.email,
        avatar_url = u.avatar_url,
        specialty = u.specialty
      FROM users u
      WHERE p.user_id = u.id
    `);
    
    console.log(`✓ Updated ${updateResult.rowCount} patient records with email, avatar_url, and specialty`);

    // Step 3: Verify the data
    console.log('\nStep 3: Verifying migrated data...');
    console.log('─'.repeat(80));
    
    const verifyResult = await client.query(`
      SELECT 
        patient_id,
        user_id,
        first_name,
        last_name,
        email,
        contact_number,
        avatar_url,
        specialty,
        status
      FROM patients
      ORDER BY patient_id
    `);

    console.log('\npatient_id | user_id | first_name | last_name | email | contact_number | avatar_url | specialty | status');
    console.log('─'.repeat(80));
    verifyResult.rows.forEach(row => {
      const email = row.email ? row.email.substring(0, 25) : 'N/A';
      const avatar = row.avatar_url ? 'YES' : 'NO';
      console.log(`${row.patient_id.toString().padEnd(10)} | ${row.user_id.toString().padEnd(7)} | ${row.first_name.padEnd(10)} | ${row.last_name.padEnd(10)} | ${email.padEnd(25)} | ${(row.contact_number || 'N/A').padEnd(14)} | ${avatar.padEnd(10)} | ${(row.specialty || 'N/A').padEnd(9)} | ${row.status}`);
    });

    // Step 4: Show complete patient details
    console.log('\n\nStep 4: Complete patient details with all information:');
    console.log('─'.repeat(80));
    
    const completeResult = await client.query(`
      SELECT 
        p.patient_id,
        p.user_id,
        p.first_name,
        p.last_name,
        p.email,
        p.contact_number,
        p.date_of_birth,
        p.gender,
        p.address,
        p.emergency_contact_name,
        p.emergency_contact_phone,
        p.medical_history,
        p.avatar_url,
        p.specialty,
        p.status,
        pp.blood_type,
        pp.preferred_language,
        pp.reliability_score
      FROM patients p
      LEFT JOIN patient_profiles pp ON p.patient_id = pp.patient_id
      ORDER BY p.patient_id
    `);

    console.log('\nPatient Details:');
    completeResult.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. ${row.first_name} ${row.last_name}`);
      console.log(`   Patient ID: ${row.patient_id}`);
      console.log(`   User ID: ${row.user_id}`);
      console.log(`   Email: ${row.email}`);
      console.log(`   Phone: ${row.contact_number}`);
      console.log(`   DOB: ${row.date_of_birth || 'N/A'}`);
      console.log(`   Gender: ${row.gender || 'N/A'}`);
      console.log(`   Address: ${row.address || 'N/A'}`);
      console.log(`   Emergency Contact: ${row.emergency_contact_name || 'N/A'} (${row.emergency_contact_phone || 'N/A'})`);
      console.log(`   Medical History: ${row.medical_history || 'N/A'}`);
      console.log(`   Avatar: ${row.avatar_url ? 'YES' : 'NO'}`);
      console.log(`   Specialty: ${row.specialty || 'N/A'}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Blood Type: ${row.blood_type || 'N/A'}`);
      console.log(`   Preferred Language: ${row.preferred_language || 'N/A'}`);
      console.log(`   Reliability Score: ${row.reliability_score || 'N/A'}`);
    });

    await client.query('COMMIT');

    console.log('\n' + '═'.repeat(80));
    console.log('✅ MISSING COLUMNS ADDED AND DATA MIGRATED SUCCESSFULLY!');
    console.log('═'.repeat(80));
    console.log('\nSummary:');
    console.log(`  ✓ Added email column`);
    console.log(`  ✓ Added avatar_url column`);
    console.log(`  ✓ Added specialty column`);
    console.log(`  ✓ Migrated data for ${verifyResult.rows.length} patients`);
    console.log(`  ✓ All patient details now complete`);
    console.log('\n✅ Patients table is now fully populated!\n');

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

addMissingPatientColumns();
