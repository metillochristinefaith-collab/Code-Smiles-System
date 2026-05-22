const db = require('./db');

async function cleanupAppointments() {
  try {
    console.log('🧹 Cleaning up old test appointments...\n');

    // Get all appointments
    const result = await db.query('SELECT id, patient_name, treatment, appointment_date, appointment_time, status FROM appointments ORDER BY id DESC');
    
    console.log(`Found ${result.rows.length} total appointments\n`);
    
    if (result.rows.length === 0) {
      console.log('No appointments to clean up.');
      process.exit(0);
    }

    // Show all appointments
    console.log('Current appointments:');
    console.log('─'.repeat(100));
    result.rows.forEach((apt, idx) => {
      console.log(`${idx + 1}. ID: ${apt.id} | ${apt.patient_name} | ${apt.treatment} | ${apt.appointment_date} ${apt.appointment_time} | Status: ${apt.status}`);
    });
    console.log('─'.repeat(100));
    console.log('\n');

    // Ask which ones to delete
    console.log('To delete appointments, run:');
    console.log('  node -e "const db = require(\'./db\'); db.query(\'DELETE FROM appointments WHERE id IN (1,2,3)\').then(() => { console.log(\'Deleted\'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });"');
    console.log('\nOr to delete ALL test appointments (keep only real ones):');
    console.log('  node -e "const db = require(\'./db\'); db.query(\'DELETE FROM appointments WHERE patient_name LIKE \'%Test%\' OR patient_name LIKE \'%Email%\' OR patient_name LIKE \'%Slot%\' OR patient_name LIKE \'%Flow%\' OR patient_name LIKE \'%Complete%\'\').then(() => { console.log(\'Deleted test appointments\'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });"');
    console.log('\nOr to delete ALL appointments:');
    console.log('  node -e "const db = require(\'./db\'); db.query(\'DELETE FROM appointments\').then(() => { console.log(\'All appointments deleted\'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });"');
    console.log('\nOr to delete appointments by ID range (e.g., delete IDs 1-50):');
    console.log('  node -e "const db = require(\'./db\'); db.query(\'DELETE FROM appointments WHERE id <= 50\').then(() => { console.log(\'Deleted\'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });"');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

cleanupAppointments();
