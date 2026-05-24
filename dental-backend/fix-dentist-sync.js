require('dotenv').config();
const db = require('./db');

async function fixDentistSync() {
  const client = await db.connect();
  try {
    console.log('\n=== FIXING DENTIST SYNC ISSUES ===\n');
    
    await client.query('BEGIN');
    
    // Step 1: Fix appointments with incorrect dentist_id
    console.log('Step 1: Fixing appointments with incorrect dentist_id...\n');
    
    const appts = await client.query(
      `SELECT id, dentist_name, dentist_id FROM appointments 
       WHERE dentist_name IS NOT NULL AND status IN ('Approved', 'Completed')
       ORDER BY id`
    );
    
    let fixed = 0;
    for (const appt of appts.rows) {
      const dentistName = appt.dentist_name;
      const currentId = appt.dentist_id;
      
      // Find the correct dentist ID
      const nameWithoutDr = dentistName.replace(/^Dr\.\s*/, '');
      const userResult = await client.query(
        `SELECT id FROM users 
         WHERE (first_name || ' ' || last_name = $1 OR first_name || ' ' || last_name = $2)
         AND role = 'Admin'`,
        [nameWithoutDr, dentistName]
      );
      
      if (userResult.rows.length > 0) {
        const correctId = userResult.rows[0].id;
        if (correctId !== currentId) {
          console.log(`  Appointment ${appt.id}: "${dentistName}"`);
          console.log(`    Old dentist_id: ${currentId} → New dentist_id: ${correctId}`);
          
          await client.query(
            `UPDATE appointments SET dentist_id = $1 WHERE id = $2`,
            [correctId, appt.id]
          );
          fixed++;
        }
      } else {
        console.log(`  ⚠️  Appointment ${appt.id}: "${dentistName}" - NO MATCHING USER FOUND`);
      }
    }
    
    console.log(`\n✓ Fixed ${fixed} appointments with incorrect dentist_id\n`);
    
    // Step 2: Handle appointments with unmatched dentist names
    console.log('Step 2: Checking for unmatched dentist names...\n');
    
    const unmatchedAppts = await client.query(
      `SELECT DISTINCT dentist_name FROM appointments 
       WHERE dentist_name IS NOT NULL 
       AND dentist_id IS NULL
       AND status IN ('Approved', 'Completed')`
    );
    
    if (unmatchedAppts.rows.length > 0) {
      console.log(`Found ${unmatchedAppts.rows.length} unmatched dentist names:\n`);
      unmatchedAppts.rows.forEach(row => {
        console.log(`  - "${row.dentist_name}"`);
      });
      console.log('\n⚠️  These dentist names do not match any user in the database.');
      console.log('   Please verify the dentist names or create the missing user accounts.\n');
    } else {
      console.log('✓ No unmatched dentist names found\n');
    }
    
    await client.query('COMMIT');
    
    console.log('=== VERIFICATION ===\n');
    
    // Verify the fix
    const verification = await db.query(
      `SELECT dentist_name, dentist_id, COUNT(*) as count 
       FROM appointments 
       WHERE status IN ('Approved', 'Completed')
       GROUP BY dentist_name, dentist_id
       ORDER BY dentist_name`
    );
    
    console.log('Appointments by dentist after fix:\n');
    verification.rows.forEach(row => {
      console.log(`  "${row.dentist_name}" (ID: ${row.dentist_id}): ${row.count} appointments`);
    });
    
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

fixDentistSync();
