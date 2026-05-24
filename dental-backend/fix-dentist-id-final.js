require('dotenv').config();
const db = require('./db');

async function fixDentistId() {
  const client = await db.connect();
  try {
    console.log('\n=== FINAL FIX: CORRECTING DENTIST_ID VALUES ===\n');
    
    await client.query('BEGIN');
    
    // Get the mapping from dentist table to users table
    const dentistTable = await client.query(`SELECT * FROM dentist ORDER BY dentist_id`);
    
    console.log('Dentist table mapping:\n');
    const mapping = {};
    
    for (const d of dentistTable.rows) {
      const dentistName = `Dr. ${d.first_name} ${d.last_name}`;
      const dentistId = d.dentist_id;
      const userId = d.user_id;
      
      mapping[dentistId] = { name: dentistName, userId: userId };
      console.log(`  dentist_id ${dentistId} → user_id ${userId} (${dentistName})`);
    }
    
    console.log('\n\nFixing appointments:\n');
    
    // For each appointment, find the correct user_id based on dentist_name
    const appts = await client.query(
      `SELECT id, dentist_id, dentist_name FROM appointments 
       WHERE status IN ('Approved', 'Completed')
       ORDER BY id`
    );
    
    let fixed = 0;
    for (const appt of appts.rows) {
      // Find the correct user_id by matching dentist_name
      let correctUserId = null;
      
      for (const [dentistId, info] of Object.entries(mapping)) {
        if (info.name === appt.dentist_name) {
          correctUserId = info.userId;
          break;
        }
      }
      
      if (correctUserId && correctUserId !== appt.dentist_id) {
        console.log(`  Appointment ${appt.id}: "${appt.dentist_name}"`);
        console.log(`    dentist_id ${appt.dentist_id} → ${correctUserId}`);
        
        await client.query(
          `UPDATE appointments SET dentist_id = $1 WHERE id = $2`,
          [correctUserId, appt.id]
        );
        fixed++;
      }
    }
    
    console.log(`\n✓ Fixed ${fixed} appointments\n`);
    
    await client.query('COMMIT');
    
    // Verify
    console.log('=== VERIFICATION ===\n');
    
    const verification = await client.query(
      `SELECT id, dentist_id, dentist_name FROM appointments 
       WHERE status IN ('Approved', 'Completed')
       ORDER BY id`
    );
    
    const users = await client.query(
      `SELECT id, first_name, last_name FROM users WHERE role = 'Admin'`
    );
    
    let allCorrect = true;
    for (const appt of verification.rows) {
      const user = users.rows.find(u => u.id === appt.dentist_id);
      const expectedName = user ? `Dr. ${user.first_name} ${user.last_name}` : 'UNKNOWN';
      const match = appt.dentist_name === expectedName;
      
      if (!match) {
        console.log(`✗ Appointment ${appt.id}: "${appt.dentist_name}" (ID: ${appt.dentist_id}) - Expected: "${expectedName}"`);
        allCorrect = false;
      }
    }
    
    if (allCorrect) {
      console.log('✓ All appointments have correct dentist_id and dentist_name!\n');
    }
    
    process.exit(allCorrect ? 0 : 1);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

fixDentistId();
