require('dotenv').config();
const db = require('./db');

async function finalVerification() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         DENTIST PORTAL SYNC - FINAL VERIFICATION           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    // 1. Check users table
    console.log('1. DENTIST ACCOUNTS IN USERS TABLE');
    console.log('─'.repeat(60));
    
    const dentists = await db.query(
      `SELECT id, first_name, last_name, email, status FROM users WHERE role = 'Admin' ORDER BY id`
    );
    
    console.log(`Found ${dentists.rowCount} dentist accounts:\n`);
    dentists.rows.forEach(d => {
      console.log(`  ✓ ID ${d.id}: Dr. ${d.first_name} ${d.last_name}`);
      console.log(`    Email: ${d.email} | Status: ${d.status}`);
    });
    
    // 2. Check appointments data
    console.log('\n\n2. APPOINTMENTS DATA INTEGRITY');
    console.log('─'.repeat(60));
    
    const appts = await db.query(
      `SELECT dentist_id, dentist_name, COUNT(*) as count 
       FROM appointments 
       WHERE status IN ('Approved', 'Completed')
       GROUP BY dentist_id, dentist_name
       ORDER BY dentist_id`
    );
    
    console.log(`Found ${appts.rowCount} dentist(s) with appointments:\n`);
    
    let allValid = true;
    for (const appt of appts.rows) {
      const dentist = dentists.rows.find(d => d.id === appt.dentist_id);
      const isValid = dentist !== undefined;
      const status = isValid ? '✓' : '✗';
      
      console.log(`  ${status} dentist_id: ${appt.dentist_id} | "${appt.dentist_name}" | ${appt.count} appointments`);
      
      if (isValid) {
        const expectedName = `Dr. ${dentist.first_name} ${dentist.last_name}`;
        if (appt.dentist_name !== expectedName) {
          console.log(`    ⚠️  Name mismatch! Expected: "${expectedName}"`);
          allValid = false;
        }
      } else {
        console.log(`    ✗ INVALID: dentist_id ${appt.dentist_id} not found in users table`);
        allValid = false;
      }
    }
    
    // 3. Check foreign key constraints
    console.log('\n\n3. FOREIGN KEY CONSTRAINTS');
    console.log('─'.repeat(60));
    
    const constraints = await db.query(
      `SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name
       FROM information_schema.key_column_usage
       WHERE (table_name IN ('appointments', 'prescriptions', 'treatment_plans', 'clinical_notes')
              AND column_name LIKE '%dentist_id%')
       ORDER BY table_name`
    );
    
    console.log(`Found ${constraints.rowCount} foreign key constraints:\n`);
    constraints.rows.forEach(c => {
      const isCorrect = c.foreign_table_name === 'users';
      const status = isCorrect ? '✓' : '✗';
      console.log(`  ${status} ${c.table_name}.${c.column_name} → ${c.foreign_table_name}(${c.foreign_column_name})`);
      if (!isCorrect) allValid = false;
    });
    
    // 4. Check for NULL dentist_id
    console.log('\n\n4. DATA QUALITY CHECK');
    console.log('─'.repeat(60));
    
    const nullCheck = await db.query(
      `SELECT 
        (SELECT COUNT(*) FROM appointments WHERE dentist_id IS NULL AND status IN ('Approved', 'Completed')) as null_appts,
        (SELECT COUNT(*) FROM prescriptions WHERE dentist_id IS NULL) as null_prescriptions,
        (SELECT COUNT(*) FROM treatment_plans WHERE dentist_id IS NULL) as null_plans,
        (SELECT COUNT(*) FROM clinical_notes WHERE dentist_id IS NULL) as null_notes`
    );
    
    const nullData = nullCheck.rows[0];
    console.log(`Null dentist_id records:\n`);
    console.log(`  Appointments: ${nullData.null_appts} ${nullData.null_appts === 0 ? '✓' : '✗'}`);
    console.log(`  Prescriptions: ${nullData.null_prescriptions} ${nullData.null_prescriptions === 0 ? '✓' : '✗'}`);
    console.log(`  Treatment Plans: ${nullData.null_plans} ${nullData.null_plans === 0 ? '✓' : '✗'}`);
    console.log(`  Clinical Notes: ${nullData.null_notes} ${nullData.null_notes === 0 ? '✓' : '✗'}`);
    
    if (nullData.null_appts > 0 || nullData.null_prescriptions > 0 || nullData.null_plans > 0 || nullData.null_notes > 0) {
      allValid = false;
    }
    
    // 5. Test dashboard queries
    console.log('\n\n5. DASHBOARD QUERY TEST');
    console.log('─'.repeat(60));
    
    console.log(`\nTesting dashboard stats for each dentist:\n`);
    
    for (const dentist of dentists.rows) {
      const dentistName = `Dr. ${dentist.first_name} ${dentist.last_name}`;
      const today = new Date().toISOString().split('T')[0];
      
      const [todayAppts, upcoming, completed, patients] = await Promise.all([
        db.query(`SELECT COUNT(*) FROM appointments WHERE appointment_date = $1 AND status = 'Approved' AND dentist_name = $2`, [today, dentistName]),
        db.query(`SELECT COUNT(*) FROM appointments WHERE appointment_date > $1 AND status = 'Approved' AND dentist_name = $2`, [today, dentistName]),
        db.query(`SELECT COUNT(*) FROM appointments WHERE status = 'Completed' AND dentist_name = $1`, [dentistName]),
        db.query(`SELECT COUNT(DISTINCT patient_id) FROM appointments WHERE patient_id IS NOT NULL AND dentist_name = $1`, [dentistName]),
      ]);
      
      const stats = {
        today: parseInt(todayAppts.rows[0].count),
        upcoming: parseInt(upcoming.rows[0].count),
        completed: parseInt(completed.rows[0].count),
        patients: parseInt(patients.rows[0].count),
      };
      
      const hasData = stats.today + stats.upcoming + stats.completed + stats.patients > 0;
      const status = hasData ? '✓' : '○';
      
      console.log(`  ${status} ${dentistName}`);
      console.log(`     Today: ${stats.today} | Upcoming: ${stats.upcoming} | Completed: ${stats.completed} | Patients: ${stats.patients}`);
    }
    
    // Final result
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    if (allValid) {
      console.log('║                    ✓ ALL CHECKS PASSED                      ║');
      console.log('║                                                            ║');
      console.log('║  Dentist portal data sync is complete and verified!        ║');
    } else {
      console.log('║                    ✗ SOME ISSUES FOUND                      ║');
      console.log('║                                                            ║');
      console.log('║  Please review the issues above.                           ║');
    }
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    process.exit(allValid ? 0 : 1);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

finalVerification();
