const db = require('./db');

(async () => {
  try {
    const rows = await db.query("SELECT id, patient_id, patient_name, dentist_id, dentist_name, status, appointment_date, appointment_time FROM appointments WHERE dentist_id = 2 ORDER BY appointment_date");
    console.log('appointments for dentist_id=2:');
    console.table(rows.rows);

    const missing = await db.query("SELECT a.id, a.patient_id, a.patient_name, a.dentist_id, a.dentist_name FROM appointments a LEFT JOIN users u ON a.patient_id = u.id WHERE a.dentist_id = 2 AND (a.patient_id IS NULL OR u.id IS NULL) ORDER BY a.appointment_date");
    console.log('appointments with missing patient user (patient_id NULL or user missing):');
    console.table(missing.rows);

    const orphan = await db.query("SELECT a.id, a.patient_id, a.patient_name FROM appointments a WHERE a.patient_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = a.patient_id) ORDER BY a.appointment_date");
    console.log('appointments with patient_id referencing no user:');
    console.table(orphan.rows);

  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
})();
