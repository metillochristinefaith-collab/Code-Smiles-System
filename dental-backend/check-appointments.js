const pool = require('./db');

async function checkAppointments() {
  try {
    const result = await pool.query(
      `SELECT appointment_date, appointment_time, duration_minutes, status 
       FROM appointments 
       WHERE status IN ('Approved', 'Pending') 
       ORDER BY appointment_date, appointment_time`
    );

    console.log('Appointments in database:');
    result.rows.forEach(row => {
      console.log(`  ${row.appointment_date} ${row.appointment_time} (${row.duration_minutes} min) [${row.status}]`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAppointments();
