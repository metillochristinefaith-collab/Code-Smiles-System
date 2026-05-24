require('dotenv').config();
const db = require('./db');

async function diagnose() {
  try {
    console.log('\n=== DENTIST SYNC DIAGNOSIS ===\n');
    
    // Get all dentists
    const dentists = await db.query(
      `SELECT id, first_name, last_name, email FROM users WHERE role = 'Admin' ORDER BY id`
    );
    
    console.log('Step 1: Checking dentist_name values in appointments table\n');
    
    const allAppts = await db.query(
      `SELECT DISTINCT dentist_name, dentist_id, COUNT(*) as count 
       FROM appointments 
       WHERE status IN ('Approved', 'Completed')
       GROUP BY dentist_name, dentist_id
       ORDER BY dentist_name`
    );
    
    console.log(`Found ${allAppts.rowCount} unique dentist_name values in appointments:\n`);
    allAppts.rows.forEach(row => {
      console.log(`  dentist_name: "${row.dentist_name}"`);
      console.log(`  dentist_id: ${row.dentist_id}`);
      console.log(`  count: ${row.count} appointments`);
      console.log('');
    });
    
    console.log('\nStep 2: Matching dentist_name values to users table\n');
    
    for (const appt of allAppts.rows) {
      const dentistName = appt.dentist_name;
      const dentistId = appt.dentist_id;
      
      // Try to find matching user
      let match = null;
      
      // First try by ID
      if (dentistId) {
        const byId = await db.query(
          `SELECT id, first_name, last_name FROM users WHERE id = $1 AND role = 'Admin'`,
          [dentistId]
        );
        if (byId.rows.length > 0) {
          match = byId.rows[0];
        }
      }
      
      // If no match by ID, try by name
      if (!match && dentistName) {
        // Remove "Dr. " prefix and try to match
        const nameWithoutDr = dentistName.replace(/^Dr\.\s*/, '');
        const byName = await db.query(
          `SELECT id, first_name, last_name FROM users 
           WHERE (first_name || ' ' || last_name = $1 OR first_name || ' ' || last_name = $2)
           AND role = 'Admin'`,
          [nameWithoutDr, dentistName]
        );
        if (byName.rows.length > 0) {
          match = byName.rows[0];
        }
      }
      
      if (match) {
        const expectedName = `Dr. ${match.first_name} ${match.last_name}`;
        const isMatch = dentistName === expectedName;
        console.log(`✓ "${dentistName}" → User ID ${match.id} (Dr. ${match.first_name} ${match.last_name})`);
        if (!isMatch) {
          console.log(`  ⚠️  NAME MISMATCH! Expected: "${expectedName}"`);
        }
      } else {
        console.log(`✗ "${dentistName}" → NO MATCHING USER FOUND`);
      }
      console.log('');
    }
    
    console.log('\nStep 3: Checking for appointments with NULL dentist_name\n');
    
    const nullAppts = await db.query(
      `SELECT COUNT(*) as count FROM appointments 
       WHERE dentist_name IS NULL AND status IN ('Approved', 'Completed')`
    );
    
    console.log(`Found ${nullAppts.rows[0].count} appointments with NULL dentist_name\n`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

diagnose();
