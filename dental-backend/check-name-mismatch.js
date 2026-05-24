require('dotenv').config();
const db = require('./db');

async function checkMismatch() {
  try {
    console.log('\n=== CHECKING NAME MISMATCHES ===\n');
    
    const appts = await db.query(
      `SELECT id, dentist_id, dentist_name FROM appointments 
       WHERE status IN ('Approved', 'Completed')
       ORDER BY dentist_id`
    );
    
    const users = await db.query(
      `SELECT id, first_name, last_name FROM users WHERE role = 'Admin'`
    );
    
    console.log('Appointments with dentist_id and dentist_name:\n');
    
    for (const appt of appts.rows) {
      const user = users.rows.find(u => u.id === appt.dentist_id);
      const expectedName = user ? `Dr. ${user.first_name} ${user.last_name}` : 'UNKNOWN';
      const match = appt.dentist_name === expectedName;
      
      console.log(`Appointment ${appt.id}:`);
      console.log(`  dentist_id: ${appt.dentist_id}`);
      console.log(`  dentist_name: "${appt.dentist_name}"`);
      console.log(`  expected: "${expectedName}"`);
      console.log(`  match: ${match ? '✓' : '✗'}`);
      console.log('');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkMismatch();
