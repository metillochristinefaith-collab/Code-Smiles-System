const db = require('./db');

(async () => {
  try {
    const u = await db.query('SELECT id, first_name, last_name, email, role FROM users WHERE id = $1', [20]);
    console.log('user 20:');
    console.table(u.rows);

    const pp = await db.query('SELECT * FROM patient_profiles WHERE user_id = $1', [20]);
    console.log('patient profile for user 20:');
    console.table(pp.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
})();
