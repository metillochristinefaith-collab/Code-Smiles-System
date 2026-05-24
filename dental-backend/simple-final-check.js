require('dotenv').config();
const db = require('./db');

async function simpleCheck() {
  try {
    console.log('\n=== DENTIST PORTAL SYNC - FINAL CHECK ===\n');
    
    // Check all dentists have correct data
    const dentists = await db.query(
      `SELECT id, first_name, last_name FROM users WHERE role = 'Admin' ORDER BY id`
    );
    
    console.log('Dentist Accounts and Their Appointments:\n');
    
    let allGood = true;
    for (const dentist of dentists.rows) {
      const dentistName = `Dr. ${dentist.first_name} ${dentist.last_name}`;
      
      const appts = await db.query(
        `SELECT COUNT(*) as count FROM appointments 
         WHERE dentist_id = $1 AND dentist_name = $2 AND status IN ('Approved', 'Completed')`,
        [dentist.id, dentistName]
      );
      
      const count = parseInt(appts.rows[0].count);
      const status = count > 0 ? '✓' : '○';
      
      console.log(`${status} ${dentistName} (ID: ${dentist.id})`);
      console.log(`   Appointments: ${count}`);
      
      // Check for mismatches
      const mismatches = await db.query(
        `SELECT COUNT(*) as count FROM appointments 
         WHERE dentist_id = $1 AND dentist_name != $2 AND status IN ('Approved', 'Completed')`,
        [dentist.id, dentistName]
      );
      
      const mismatchCount = parseInt(mismatches.rows[0].count);
      if (mismatchCount > 0) {
        console.log(`   ✗ WARNING: ${mismatchCount} appointments with name mismatch!`);
        allGood = false;
      }
    }
    
    console.log('\n=== SUMMARY ===\n');
    
    const totalAppts = await db.query(
      `SELECT COUNT(*) as count FROM appointments WHERE status IN ('Approved', 'Completed')`
    );
    
    const totalWithCorrectId = await db.query(
      `SELECT COUNT(*) as count FROM appointments a
       WHERE a.status IN ('Approved', 'Completed')
       AND a.dentist_id IN (SELECT id FROM users WHERE role = 'Admin')
       AND a.dentist_name = 'Dr. ' || (SELECT first_name || ' ' || last_name FROM users WHERE id = a.dentist_id)`
    );
    
    const total = parseInt(totalAppts.rows[0].count);
    const correct = parseInt(totalWithCorrectId.rows[0].count);
    
    console.log(`Total Appointments: ${total}`);
    console.log(`Correct dentist_id & dentist_name: ${correct}`);
    console.log(`Mismatches: ${total - correct}`);
    
    if (allGood && total === correct) {
      console.log('\n✓ ALL CHECKS PASSED - Dentist portal is fully synced!\n');
      process.exit(0);
    } else {
      console.log('\n✗ Some issues remain\n');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

simpleCheck();
