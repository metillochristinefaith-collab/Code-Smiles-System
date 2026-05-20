/**
 * Fix: Link appointments to patient accounts by matching email
 * Run: node fix-patient-links.js
 */
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost', port: 5432,
  user: 'postgres', password: 'Dububear101523',
  database: 'code_smiles_db'
});

async function fix() {
  console.log('=== Fixing patient_id links in appointments ===\n');

  // Step 1: Link appointments to patient accounts by matching email
  const linked = await pool.query(`
    UPDATE appointments a
    SET patient_id = u.id
    FROM users u
    WHERE LOWER(a.email) = LOWER(u.email)
      AND u.role = 'Patient'
      AND a.patient_id IS NULL
    RETURNING a.id, a.patient_name, a.email, u.id as linked_user_id
  `);

  console.log('Linked', linked.rowCount, 'appointments to patient accounts:');
  linked.rows.forEach(r =>
    console.log(`  Appointment #${r.id} "${r.patient_name}" (${r.email}) → user_id ${r.linked_user_id}`)
  );

  // Step 2: Check remaining unlinked (guest bookings with no account)
  const unlinked = await pool.query(`
    SELECT id, patient_name, email FROM appointments WHERE patient_id IS NULL
  `);
  console.log('\nStill unlinked (no matching account):', unlinked.rowCount);
  unlinked.rows.forEach(r =>
    console.log(`  Appointment #${r.id} "${r.patient_name}" (${r.email})`)
  );

  // Step 3: Show final state
  const all = await pool.query(`
    SELECT a.id, a.patient_name, a.patient_id, a.status
    FROM appointments a
    ORDER BY a.id
  `);
  console.log('\nAll appointments after fix:');
  all.rows.forEach(r =>
    console.log(`  #${r.id} ${r.patient_name} | patient_id: ${r.patient_id || 'NULL (guest)'} | ${r.status}`)
  );

  await pool.end();
  console.log('\nDone!');
}

fix().catch(err => {
  console.error('Error:', err.message);
  pool.end();
});
