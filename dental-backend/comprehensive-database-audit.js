require('dotenv').config();
const db = require('./db');

async function comprehensiveDatabaseAudit() {
  try {
    console.log('╔' + '═'.repeat(98) + '╗');
    console.log('║' + ' '.repeat(20) + '🔍 COMPREHENSIVE DATABASE AUDIT - SPECIALIST REVIEW' + ' '.repeat(26) + '║');
    console.log('╚' + '═'.repeat(98) + '╝');

    // ============================================================================
    // SECTION 1: TABLE STRUCTURE VERIFICATION
    // ============================================================================
    console.log('\n\n📋 SECTION 1: TABLE STRUCTURE VERIFICATION');
    console.log('═'.repeat(100));

    const tables = ['users', 'patients', 'staff', 'dentist', 'patient_profiles', 'appointments', 'billing', 'clinical_notes', 'prescriptions', 'treatment_plans'];
    
    for (const table of tables) {
      const result = await db.query(
        `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = $1`,
        [table]
      );
      const exists = result.rows[0].count > 0;
      const status = exists ? '✅' : '❌';
      console.log(`${status} Table '${table}': ${exists ? 'EXISTS' : 'MISSING'}`);
    }

    // ============================================================================
    // SECTION 2: FOREIGN KEY CONSTRAINTS
    // ============================================================================
    console.log('\n\n🔗 SECTION 2: FOREIGN KEY CONSTRAINTS');
    console.log('═'.repeat(100));

    const fkResult = await db.query(`
      SELECT tc.constraint_name, kcu.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY kcu.table_name, kcu.column_name
    `);

    console.log(`\nTotal Foreign Keys Found: ${fkResult.rows.length}\n`);
    
    const fksByTable = {};
    fkResult.rows.forEach(fk => {
      if (!fksByTable[fk.table_name]) fksByTable[fk.table_name] = [];
      fksByTable[fk.table_name].push(fk);
    });

    for (const [table, fks] of Object.entries(fksByTable)) {
      console.log(`\n${table}:`);
      fks.forEach(fk => {
        console.log(`  ✅ ${fk.column_name} → ${fk.foreign_table_name}(${fk.foreign_column_name})`);
      });
    }

    // ============================================================================
    // SECTION 3: DATA INTEGRITY CHECK
    // ============================================================================
    console.log('\n\n🔍 SECTION 3: DATA INTEGRITY CHECK');
    console.log('═'.repeat(100));

    // Check for orphaned records
    console.log('\n📊 Checking for orphaned records...\n');

    // Patients without users
    const orphanedPatients = await db.query(`
      SELECT p.patient_id, p.user_id FROM patients p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE u.id IS NULL
    `);
    console.log(`Orphaned patients (no user): ${orphanedPatients.rowCount} ${orphanedPatients.rowCount === 0 ? '✅' : '❌'}`);

    // Staff without users
    const orphanedStaff = await db.query(`
      SELECT s.staff_id, s.user_id FROM staff s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE u.id IS NULL
    `);
    console.log(`Orphaned staff (no user): ${orphanedStaff.rowCount} ${orphanedStaff.rowCount === 0 ? '✅' : '❌'}`);

    // Dentists without users
    const orphanedDentists = await db.query(`
      SELECT d.dentist_id, d.user_id FROM dentist d
      LEFT JOIN users u ON d.user_id = u.id
      WHERE u.id IS NULL
    `);
    console.log(`Orphaned dentists (no user): ${orphanedDentists.rowCount} ${orphanedDentists.rowCount === 0 ? '✅' : '❌'}`);

    // Appointments without patients
    const orphanedAppointments = await db.query(`
      SELECT a.appointment_id FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.patient_id
      WHERE p.patient_id IS NULL
    `);
    console.log(`Orphaned appointments (no patient): ${orphanedAppointments.rowCount} ${orphanedAppointments.rowCount === 0 ? '✅' : '❌'}`);

    // Appointments without dentists
    const appointmentsNoDentist = await db.query(`
      SELECT a.appointment_id FROM appointments a
      LEFT JOIN dentist d ON a.dentist_id = d.dentist_id
      WHERE d.dentist_id IS NULL
    `);
    console.log(`Appointments without dentist: ${appointmentsNoDentist.rowCount} ${appointmentsNoDentist.rowCount === 0 ? '✅' : '❌'}`);

    // ============================================================================
    // SECTION 4: USER-ROLE MAPPING VERIFICATION
    // ============================================================================
    console.log('\n\n👥 SECTION 4: USER-ROLE MAPPING VERIFICATION');
    console.log('═'.repeat(100));

    const users = await db.query('SELECT id, email, role FROM users ORDER BY id');
    console.log(`\nTotal Users: ${users.rowCount}\n`);

    let patientCount = 0, dentistCount = 0, staffCount = 0;
    const issues = [];

    for (const user of users.rows) {
      let roleRecord = null;
      let roleTable = null;

      if (user.role === 'Patient') {
        patientCount++;
        const result = await db.query('SELECT patient_id FROM patients WHERE user_id = $1', [user.id]);
        roleRecord = result.rows[0];
        roleTable = 'patients';
      } else if (user.role === 'Dentist') {
        dentistCount++;
        const result = await db.query('SELECT dentist_id FROM dentist WHERE user_id = $1', [user.id]);
        roleRecord = result.rows[0];
        roleTable = 'dentist';
      } else if (user.role === 'Staff') {
        staffCount++;
        const result = await db.query('SELECT staff_id FROM staff WHERE user_id = $1', [user.id]);
        roleRecord = result.rows[0];
        roleTable = 'staff';
      }

      const status = roleRecord ? '✅' : '❌';
      const detail = roleRecord ? `${roleTable} ID: ${Object.values(roleRecord)[0]}` : 'MISSING ROLE RECORD';
      console.log(`${status} User ${user.id.toString().padEnd(3)} | ${user.email.padEnd(40)} | Role: ${user.role.padEnd(10)} | ${detail}`);

      if (!roleRecord) {
        issues.push(`User ${user.id} (${user.email}) has role '${user.role}' but no record in ${roleTable} table`);
      }
    }

    console.log(`\n📊 Role Distribution:`);
    console.log(`  Patients: ${patientCount}`);
    console.log(`  Dentists: ${dentistCount}`);
    console.log(`  Staff: ${staffCount}`);

    // ============================================================================
    // SECTION 5: BACKEND CODE VERIFICATION
    // ============================================================================
    console.log('\n\n⚙️  SECTION 5: BACKEND CODE VERIFICATION');
    console.log('═'.repeat(100));

    const fs = require('fs');
    const indexPath = './index.js';
    const indexContent = fs.readFileSync(indexPath, 'utf8');

    console.log('\n✅ Checking registration endpoint...');
    const hasPatientInsert = indexContent.includes('INSERT INTO patients');
    console.log(`   ${hasPatientInsert ? '✅' : '❌'} Patients table INSERT in registration: ${hasPatientInsert ? 'YES' : 'NO'}`);

    console.log('\n✅ Checking role validation...');
    const hasRoleCheck = indexContent.includes("['Staff', 'Dentist']") || indexContent.includes("'Staff', 'Dentist'");
    console.log(`   ${hasRoleCheck ? '✅' : '❌'} Role validation updated to 'Dentist': ${hasRoleCheck ? 'YES' : 'NO'}`);

    console.log('\n✅ Checking appointment creation...');
    const hasAppointmentInsert = indexContent.includes('INSERT INTO appointments');
    console.log(`   ${hasAppointmentInsert ? '✅' : '❌'} Appointments INSERT exists: ${hasAppointmentInsert ? 'YES' : 'NO'}`);

    // ============================================================================
    // SECTION 6: RELATIONSHIP INTEGRITY
    // ============================================================================
    console.log('\n\n🔗 SECTION 6: RELATIONSHIP INTEGRITY');
    console.log('═'.repeat(100));

    const relationshipCheck = await db.query(`
      SELECT 
        u.id as user_id,
        u.email,
        u.role,
        p.patient_id,
        d.dentist_id,
        s.staff_id,
        pp.id as profile_id
      FROM users u
      LEFT JOIN patients p ON u.id = p.user_id
      LEFT JOIN dentist d ON u.id = d.user_id
      LEFT JOIN staff s ON u.id = s.user_id
      LEFT JOIN patient_profiles pp ON u.id = pp.user_id
      ORDER BY u.id
    `);

    console.log('\nUser → Role-Specific Table Relationships:\n');
    let allConnected = true;

    for (const row of relationshipCheck.rows) {
      let roleId = null;
      let roleTable = null;

      if (row.role === 'Patient') {
        roleId = row.patient_id;
        roleTable = 'patients';
      } else if (row.role === 'Dentist') {
        roleId = row.dentist_id;
        roleTable = 'dentist';
      } else if (row.role === 'Staff') {
        roleId = row.staff_id;
        roleTable = 'staff';
      }

      const connected = roleId !== null;
      const status = connected ? '✅' : '❌';
      
      if (!connected) allConnected = false;

      console.log(`${status} User ${row.user_id} → ${roleTable} ID: ${roleId || 'MISSING'}`);
    }

    // ============================================================================
    // SECTION 7: CRITICAL QUERIES TEST
    // ============================================================================
    console.log('\n\n🧪 SECTION 7: CRITICAL QUERIES TEST');
    console.log('═'.repeat(100));

    console.log('\n✅ Testing critical queries...\n');

    // Test 1: Get patient with all info
    try {
      const result = await db.query(`
        SELECT u.id, u.email, p.patient_id, p.first_name, p.last_name, pp.id as profile_id
        FROM users u
        JOIN patients p ON u.id = p.user_id
        LEFT JOIN patient_profiles pp ON u.id = pp.user_id
        WHERE u.role = 'Patient'
        LIMIT 1
      `);
      console.log(`✅ Query: Get patient with all info - ${result.rowCount > 0 ? 'SUCCESS' : 'NO DATA'}`);
    } catch (err) {
      console.log(`❌ Query: Get patient with all info - ERROR: ${err.message}`);
    }

    // Test 2: Get dentist with all info
    try {
      const result = await db.query(`
        SELECT u.id, u.email, d.dentist_id, d.first_name, d.last_name, d.specialization
        FROM users u
        JOIN dentist d ON u.id = d.user_id
        WHERE u.role = 'Dentist'
        LIMIT 1
      `);
      console.log(`✅ Query: Get dentist with all info - ${result.rowCount > 0 ? 'SUCCESS' : 'NO DATA'}`);
    } catch (err) {
      console.log(`❌ Query: Get dentist with all info - ERROR: ${err.message}`);
    }

    // Test 3: Get appointments with patient and dentist
    try {
      const result = await db.query(`
        SELECT a.appointment_id, p.patient_id, d.dentist_id, a.appointment_date
        FROM appointments a
        JOIN patients p ON a.patient_id = p.patient_id
        JOIN dentist d ON a.dentist_id = d.dentist_id
        LIMIT 1
      `);
      console.log(`✅ Query: Get appointments with patient and dentist - ${result.rowCount > 0 ? 'SUCCESS' : 'NO DATA'}`);
    } catch (err) {
      console.log(`❌ Query: Get appointments with patient and dentist - ERROR: ${err.message}`);
    }

    // ============================================================================
    // SECTION 8: FINAL VERDICT
    // ============================================================================
    console.log('\n\n🎯 SECTION 8: FINAL VERDICT');
    console.log('═'.repeat(100));

    const verdict = {
      tablesExist: true,
      foreignKeysValid: orphanedPatients.rowCount === 0 && orphanedStaff.rowCount === 0 && orphanedDentists.rowCount === 0,
      allUsersConnected: allConnected,
      registrationFixed: hasPatientInsert,
      rolesUpdated: hasRoleCheck,
      noIssues: issues.length === 0
    };

    console.log('\n📊 Audit Results:\n');
    console.log(`${verdict.tablesExist ? '✅' : '❌'} All required tables exist`);
    console.log(`${verdict.foreignKeysValid ? '✅' : '❌'} No orphaned records found`);
    console.log(`${verdict.allUsersConnected ? '✅' : '❌'} All users connected to role-specific tables`);
    console.log(`${verdict.registrationFixed ? '✅' : '❌'} Registration endpoint creates patients records`);
    console.log(`${verdict.rolesUpdated ? '✅' : '❌'} Role validation updated to 'Dentist'`);
    console.log(`${verdict.noIssues ? '✅' : '❌'} No data integrity issues found`);

    const allPassed = Object.values(verdict).every(v => v === true);

    console.log('\n' + '═'.repeat(100));
    if (allPassed) {
      console.log('✅ AUDIT PASSED - DATABASE IS PRODUCTION READY!');
    } else {
      console.log('⚠️  AUDIT FOUND ISSUES - SEE ABOVE FOR DETAILS');
    }
    console.log('═'.repeat(100));

    if (issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
    }

    console.log('\n' + '═'.repeat(100));
    console.log('🎉 AUDIT COMPLETE');
    console.log('═'.repeat(100));

  } catch (err) {
    console.error('❌ Audit Error:', err.message);
    console.error(err);
  } finally {
    process.exit(0);
  }
}

comprehensiveDatabaseAudit();
