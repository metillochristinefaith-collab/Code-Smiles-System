require('dotenv').config();
const db = require('./db');

async function debugQuery() {
  try {
    console.log('\n=== DEBUGGING DASHBOARD QUERY ===\n');
    
    // Test with Dr. Raphoncel Eduria
    const dentistName = 'Dr. Raphoncel Eduria';
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`Testing with dentist_name: "${dentistName}"`);
    console.log(`Today's date: ${today}\n`);
    
    // Test 1: Check if appointments exist with this exact name
    console.log('Test 1: Appointments with exact dentist_name match\n');
    
    const exactMatch = await db.query(
      `SELECT id, patient_name, appointment_date, status, dentist_name, dentist_id
       FROM appointments 
       WHERE dentist_name = $1
       ORDER BY appointment_date`,
      [dentistName]
    );
    
    console.log(`Found ${exactMatch.rowCount} appointments:\n`);
    exactMatch.rows.forEach(a => {
      console.log(`  ID: ${a.id}, Patient: ${a.patient_name}, Date: ${a.appointment_date}, Status: ${a.status}`);
    });
    
    // Test 2: Run the exact dashboard query
    console.log('\n\nTest 2: Running exact dashboard queries\n');
    
    const todayAppts = await db.query(
      `SELECT COUNT(*) FROM appointments WHERE appointment_date = $1 AND status = 'Approved' AND dentist_name = $2`,
      [today, dentistName]
    );
    
    const upcoming = await db.query(
      `SELECT COUNT(*) FROM appointments WHERE appointment_date > $1 AND status = 'Approved' AND dentist_name = $2`,
      [today, dentistName]
    );
    
    const completed = await db.query(
      `SELECT COUNT(*) FROM appointments WHERE status = 'Completed' AND dentist_name = $1`,
      [dentistName]
    );
    
    const patients = await db.query(
      `SELECT COUNT(DISTINCT patient_id) FROM appointments WHERE patient_id IS NOT NULL AND dentist_name = $1`,
      [dentistName]
    );
    
    console.log(`Today's Appointments: ${todayAppts.rows[0].count}`);
    console.log(`Upcoming: ${upcoming.rows[0].count}`);
    console.log(`Completed: ${completed.rows[0].count}`);
    console.log(`Patients: ${patients.rows[0].count}`);
    
    // Test 3: Check what statuses exist for this dentist
    console.log('\n\nTest 3: All statuses for this dentist\n');
    
    const statuses = await db.query(
      `SELECT status, COUNT(*) as count FROM appointments WHERE dentist_name = $1 GROUP BY status`,
      [dentistName]
    );
    
    console.log('Appointments by status:');
    statuses.rows.forEach(s => {
      console.log(`  ${s.status}: ${s.count}`);
    });
    
    // Test 4: Check if there's a case sensitivity issue
    console.log('\n\nTest 4: Case-insensitive search\n');
    
    const caseInsensitive = await db.query(
      `SELECT COUNT(*) as count FROM appointments WHERE LOWER(dentist_name) = LOWER($1)`,
      [dentistName]
    );
    
    console.log(`Case-insensitive match: ${caseInsensitive.rows[0].count}`);
    
    // Test 5: Check all unique dentist_name values
    console.log('\n\nTest 5: All unique dentist_name values in database\n');
    
    const allNames = await db.query(
      `SELECT DISTINCT dentist_name, COUNT(*) as count FROM appointments GROUP BY dentist_name ORDER BY dentist_name`
    );
    
    console.log('All dentist names in appointments table:');
    allNames.rows.forEach(n => {
      console.log(`  "${n.dentist_name}": ${n.count} appointments`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

debugQuery();
