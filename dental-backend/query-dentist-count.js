const db = require('./db');

(async () => {
  try {
    const dentistRes = await db.query(
      "SELECT id, email, first_name, last_name, role FROM users WHERE LOWER(email) = 'acojedo@codesmiles.com' OR first_name ILIKE '%derence%' OR last_name ILIKE '%acojedo%'"
    );
    console.log('Dentist rows:');
    console.table(dentistRes.rows);

    const appts = await db.query(
      `SELECT id, patient_name, treatment, status, dentist_id, dentist_name, appointment_date, appointment_time
       FROM appointments
       WHERE dentist_id = 2
       ORDER BY appointment_date, appointment_time`
    );
    console.log('Appointments for dentist_id=2:', appts.rows.length);
    console.table(appts.rows);

    const counts = await db.query(
      `SELECT status, COUNT(*)
       FROM appointments
       WHERE dentist_id = 2
       GROUP BY status
       ORDER BY status`
    );
    console.log('Status counts for dentist_id=2:');
    console.table(counts.rows);

    const approved = await db.query(
      `SELECT COUNT(*) FROM appointments WHERE status = 'Approved' AND dentist_id = 2`
    );
    console.log('Approved count for dentist_id=2:', approved.rows[0].count);

    const dentistName = 'Dr. Derence Acojedo';
    const nameCount = await db.query(
      `SELECT COUNT(*) FROM appointments WHERE status = 'Approved' AND dentist_name = $1`,
      [dentistName]
    );
    console.log('Approved count for dentist_name =', dentistName, ':', nameCount.rows[0].count);
    const ambiguous = await db.query(
      `SELECT id, status, dentist_id, dentist_name, appointment_date, appointment_time
       FROM appointments
       WHERE status = 'Approved' AND (LOWER(dentist_name) LIKE '%acojedo%' OR LOWER(dentist_name) LIKE '%derence%')
       ORDER BY appointment_date, appointment_time`
    );
    console.log('Approved rows matching dentist name fragments:');
    console.table(ambiguous.rows);
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    process.exit();
  }
})();
