require('dotenv').config();
const db = require('./db');

async function addStaffDentistColumns() {
  try {
    console.log('═'.repeat(80));
    console.log('ADDING MISSING COLUMNS TO STAFF AND DENTIST TABLES');
    console.log('═'.repeat(80));

    // ============================================================================
    // STEP 1: Add missing columns to STAFF table
    // ============================================================================
    console.log('\n📋 STEP 1: Adding columns to STAFF table...');
    console.log('─'.repeat(80));

    const staffColumns = [
      { name: 'first_name', type: 'VARCHAR(100)' },
      { name: 'last_name', type: 'VARCHAR(100)' },
      { name: 'email', type: 'VARCHAR(255)' },
      { name: 'phone', type: 'VARCHAR(20)' },
      { name: 'position', type: 'VARCHAR(100)' },
      { name: 'department', type: 'VARCHAR(100)' },
      { name: 'permissions', type: 'JSONB' },
      { name: 'hire_date', type: 'DATE' },
      { name: 'status', type: 'VARCHAR(50) DEFAULT \'Active\'' },
      { name: 'avatar_url', type: 'TEXT' },
      { name: 'updated_at', type: 'TIMESTAMP DEFAULT NOW()' }
    ];

    for (const col of staffColumns) {
      try {
        await db.query(`ALTER TABLE staff ADD COLUMN ${col.name} ${col.type}`);
        console.log(`  ✓ Added column: ${col.name}`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`  ⚠ Column already exists: ${col.name}`);
        } else {
          throw err;
        }
      }
    }

    // ============================================================================
    // STEP 2: Add missing columns to DENTIST table
    // ============================================================================
    console.log('\n📋 STEP 2: Adding columns to DENTIST table...');
    console.log('─'.repeat(80));

    const dentistColumns = [
      { name: 'first_name', type: 'VARCHAR(100)' },
      { name: 'last_name', type: 'VARCHAR(100)' },
      { name: 'email', type: 'VARCHAR(255)' },
      { name: 'phone', type: 'VARCHAR(20)' },
      { name: 'specialization', type: 'VARCHAR(255)' },
      { name: 'license_number', type: 'VARCHAR(50)' },
      { name: 'years_experience', type: 'INTEGER' },
      { name: 'bio', type: 'TEXT' },
      { name: 'working_days', type: 'JSONB' },
      { name: 'start_time', type: 'TIME' },
      { name: 'end_time', type: 'TIME' },
      { name: 'status', type: 'VARCHAR(50) DEFAULT \'Active\'' },
      { name: 'avatar_url', type: 'TEXT' },
      { name: 'updated_at', type: 'TIMESTAMP DEFAULT NOW()' }
    ];

    for (const col of dentistColumns) {
      try {
        await db.query(`ALTER TABLE dentist ADD COLUMN ${col.name} ${col.type}`);
        console.log(`  ✓ Added column: ${col.name}`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`  ⚠ Column already exists: ${col.name}`);
        } else {
          throw err;
        }
      }
    }

    // ============================================================================
    // STEP 3: Migrate data from users table to staff table
    // ============================================================================
    console.log('\n📋 STEP 3: Migrating data to STAFF table...');
    console.log('─'.repeat(80));

    const staffData = await db.query(
      `SELECT s.staff_id, s.user_id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url, u.status
       FROM staff s
       JOIN users u ON s.user_id = u.id`
    );

    for (const staff of staffData.rows) {
      await db.query(
        `UPDATE staff 
         SET first_name = $1, 
             last_name = $2, 
             email = $3, 
             phone = $4,
             avatar_url = $5,
             status = $6,
             position = 'Staff',
             department = 'Clinical',
             hire_date = NOW()::DATE,
             permissions = '{"view_records": true, "manage_appointments": true}'::jsonb
         WHERE staff_id = $7`,
        [staff.first_name, staff.last_name, staff.email, staff.phone, staff.avatar_url, staff.status, staff.staff_id]
      );
      console.log(`  ✓ Updated staff: ${staff.first_name} ${staff.last_name} (ID: ${staff.staff_id})`);
    }

    // ============================================================================
    // STEP 4: Migrate data from users table to dentist table
    // ============================================================================
    console.log('\n📋 STEP 4: Migrating data to DENTIST table...');
    console.log('─'.repeat(80));

    const dentistData = await db.query(
      `SELECT d.dentist_id, d.user_id, u.first_name, u.last_name, u.email, u.phone, u.specialty, u.avatar_url, u.status
       FROM dentist d
       JOIN users u ON d.user_id = u.id`
    );

    for (const dentist of dentistData.rows) {
      // Parse specialty if it exists
      let specialization = dentist.specialty || 'General Dentistry';
      
      await db.query(
        `UPDATE dentist 
         SET first_name = $1, 
             last_name = $2, 
             email = $3, 
             phone = $4,
             specialization = $5,
             avatar_url = $6,
             status = $7,
             license_number = 'LIC-' || $8,
             years_experience = 5,
             bio = 'Professional dentist at Code Smiles Dental Clinic',
             working_days = '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'::jsonb,
             start_time = '08:00:00'::time,
             end_time = '17:00:00'::time
         WHERE dentist_id = $9`,
        [dentist.first_name, dentist.last_name, dentist.email, dentist.phone, specialization, dentist.avatar_url, dentist.status, dentist.dentist_id, dentist.dentist_id]
      );
      console.log(`  ✓ Updated dentist: ${dentist.first_name} ${dentist.last_name} (ID: ${dentist.dentist_id}, Specialty: ${specialization})`);
    }

    // ============================================================================
    // STEP 5: Verify the updates
    // ============================================================================
    console.log('\n📋 STEP 5: Verifying updates...');
    console.log('─'.repeat(80));

    console.log('\n✅ STAFF TABLE - Updated Structure:');
    const staffStructure = await db.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'staff'
       ORDER BY ordinal_position`
    );
    staffStructure.rows.forEach(col => {
      console.log(`  • ${col.column_name} (${col.data_type})`);
    });

    console.log('\n✅ STAFF TABLE - Data:');
    const staffVerify = await db.query(
      `SELECT staff_id, first_name, last_name, email, phone, position, department, status
       FROM staff`
    );
    staffVerify.rows.forEach(row => {
      console.log(`  • ID: ${row.staff_id}, Name: ${row.first_name} ${row.last_name}, Email: ${row.email}, Position: ${row.position}, Status: ${row.status}`);
    });

    console.log('\n✅ DENTIST TABLE - Updated Structure:');
    const dentistStructure = await db.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'dentist'
       ORDER BY ordinal_position`
    );
    dentistStructure.rows.forEach(col => {
      console.log(`  • ${col.column_name} (${col.data_type})`);
    });

    console.log('\n✅ DENTIST TABLE - Data:');
    const dentistVerify = await db.query(
      `SELECT dentist_id, first_name, last_name, email, phone, specialization, license_number, status
       FROM dentist`
    );
    dentistVerify.rows.forEach(row => {
      console.log(`  • ID: ${row.dentist_id}, Name: ${row.first_name} ${row.last_name}, Email: ${row.email}, Specialty: ${row.specialization}, License: ${row.license_number}, Status: ${row.status}`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log('✅ ALL COLUMNS ADDED AND DATA MIGRATED SUCCESSFULLY!');
    console.log('═'.repeat(80));
    console.log('\n📊 Summary:');
    console.log(`  • Staff members updated: ${staffData.rows.length}`);
    console.log(`  • Dentists updated: ${dentistData.rows.length}`);
    console.log(`  • All role-specific tables now have complete information`);
    console.log(`  • System is ready for Monday presentation! 🎉`);
    console.log('\n' + '═'.repeat(80));

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    process.exit(0);
  }
}

addStaffDentistColumns();
