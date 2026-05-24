require('dotenv').config();
const db = require('./db');

async function comprehensiveFix() {
  const client = await db.connect();
  try {
    console.log('\n=== COMPREHENSIVE DENTIST SYNC FIX ===\n');
    
    await client.query('BEGIN');
    
    // Step 1: Get all dentists from both tables
    console.log('Step 1: Analyzing dentist data in both tables...\n');
    
    const dentistTableResult = await client.query(`SELECT * FROM dentist ORDER BY dentist_id`);
    const usersTableResult = await client.query(`SELECT id, first_name, last_name, email FROM users WHERE role = 'Admin' ORDER BY id`);
    
    console.log(`Dentist table: ${dentistTableResult.rowCount} records`);
    console.log(`Users table (Admin role): ${usersTableResult.rowCount} records\n`);
    
    // Step 2: Map dentist table to users table
    console.log('Step 2: Mapping dentist table to users table...\n');
    
    const dentistMap = {}; // dentist_id -> user_id
    
    for (const dentist of dentistTableResult.rows) {
      const dentistName = `${dentist.first_name} ${dentist.last_name}`;
      const dentistId = dentist.dentist_id;
      const userId = dentist.user_id;
      
      // Find matching user
      const userMatch = usersTableResult.rows.find(u => 
        u.id === userId || 
        `${u.first_name} ${u.last_name}` === dentistName
      );
      
      if (userMatch) {
        dentistMap[dentistId] = userMatch.id;
        console.log(`✓ dentist_id ${dentistId} (${dentistName}) → user_id ${userMatch.id}`);
      } else {
        console.log(`✗ dentist_id ${dentistId} (${dentistName}) → NO MATCHING USER`);
      }
    }
    
    // Step 3: Fix appointments - update dentist_id to reference users table
    console.log('\n\nStep 3: Fixing appointments table...\n');
    
    const appts = await client.query(
      `SELECT id, dentist_id, dentist_name FROM appointments WHERE dentist_id IS NOT NULL`
    );
    
    let fixed = 0;
    for (const appt of appts.rows) {
      const oldDentistId = appt.dentist_id;
      const newDentistId = dentistMap[oldDentistId];
      
      if (newDentistId && newDentistId !== oldDentistId) {
        await client.query(
          `UPDATE appointments SET dentist_id = $1 WHERE id = $2`,
          [newDentistId, appt.id]
        );
        console.log(`  Appointment ${appt.id}: dentist_id ${oldDentistId} → ${newDentistId}`);
        fixed++;
      }
    }
    
    console.log(`\n✓ Fixed ${fixed} appointments\n`);
    
    // Step 4: Fix prescriptions
    console.log('Step 4: Fixing prescriptions table...\n');
    
    const prescriptions = await client.query(
      `SELECT id, dentist_id, dentist_name FROM prescriptions WHERE dentist_id IS NOT NULL`
    );
    
    let fixedPrescriptions = 0;
    for (const presc of prescriptions.rows) {
      const oldDentistId = presc.dentist_id;
      const newDentistId = dentistMap[oldDentistId];
      
      if (newDentistId && newDentistId !== oldDentistId) {
        await client.query(
          `UPDATE prescriptions SET dentist_id = $1 WHERE id = $2`,
          [newDentistId, presc.id]
        );
        fixedPrescriptions++;
      }
    }
    
    console.log(`✓ Fixed ${fixedPrescriptions} prescriptions\n`);
    
    // Step 5: Fix treatment_plans
    console.log('Step 5: Fixing treatment_plans table...\n');
    
    const plans = await client.query(
      `SELECT id, dentist_id FROM treatment_plans WHERE dentist_id IS NOT NULL`
    );
    
    let fixedPlans = 0;
    for (const plan of plans.rows) {
      const oldDentistId = plan.dentist_id;
      const newDentistId = dentistMap[oldDentistId];
      
      if (newDentistId && newDentistId !== oldDentistId) {
        await client.query(
          `UPDATE treatment_plans SET dentist_id = $1 WHERE id = $2`,
          [newDentistId, plan.id]
        );
        fixedPlans++;
      }
    }
    
    console.log(`✓ Fixed ${fixedPlans} treatment plans\n`);
    
    // Step 6: Fix clinical_notes
    console.log('Step 6: Fixing clinical_notes table...\n');
    
    const notes = await client.query(
      `SELECT id, dentist_id FROM clinical_notes WHERE dentist_id IS NOT NULL`
    );
    
    let fixedNotes = 0;
    for (const note of notes.rows) {
      const oldDentistId = note.dentist_id;
      const newDentistId = dentistMap[oldDentistId];
      
      if (newDentistId && newDentistId !== oldDentistId) {
        await client.query(
          `UPDATE clinical_notes SET dentist_id = $1 WHERE id = $2`,
          [newDentistId, note.id]
        );
        fixedNotes++;
      }
    }
    
    console.log(`✓ Fixed ${fixedNotes} clinical notes\n`);
    
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
      const userMatch = usersTableResult.rows.find(u => u.id === row.dentist_id);
      const status = userMatch ? '✓' : '✗';
      console.log(`  ${status} "${row.dentist_name}" (dentist_id: ${row.dentist_id}): ${row.count} appointments`);
    });
    
    console.log('\n✓ Database sync complete!\n');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

comprehensiveFix();
