/**
 * Clean up test/duplicate data from development
 * Keeps: All Approved/Completed/Cancelled/Rescheduled appointments
 * Removes: Duplicate Pending appointments (keeps only the most recent per patient)
 * Run: node cleanup-test-data.js
 */
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost', port: 5432,
  user: 'postgres', password: 'Dububear101523',
  database: 'code_smiles_db'
});

async function cleanup() {
  console.log('=== Cleaning up test/duplicate data ===\n');

  // Show current state
  const before = await pool.query(`SELECT status, COUNT(*) FROM appointments GROUP BY status ORDER BY status`);
  console.log('Before cleanup:');
  before.rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));

  // Delete test appointments (Test Patient with no real account)
  const testDel = await pool.query(`
    DELETE FROM appointments 
    WHERE patient_name = 'Test Patient' 
      AND patient_id IS NULL
    RETURNING id
  `);
  console.log(`\nDeleted ${testDel.rowCount} "Test Patient" guest appointments`);

  // Delete duplicate pending appointments - keep only the latest per patient
  const dupDel = await pool.query(`
    DELETE FROM appointments
    WHERE id NOT IN (
      SELECT id FROM appointments WHERE status != 'Pending'
      UNION
      SELECT id FROM (
        SELECT DISTINCT ON (patient_id) id 
        FROM appointments 
        WHERE status = 'Pending' AND patient_id IS NOT NULL
        ORDER BY patient_id, created_at DESC
      ) latest
    )
    AND status = 'Pending'
    AND patient_id IS NOT NULL
    RETURNING id, patient_name
  `);
  console.log(`Deleted ${dupDel.rowCount} duplicate pending appointments`);

  // Show final state
  const after = await pool.query(`SELECT status, COUNT(*) FROM appointments GROUP BY status ORDER BY status`);
  console.log('\nAfter cleanup:');
  after.rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));

  const remaining = await pool.query(`
    SELECT id, patient_name, treatment, status, 
           TO_CHAR(appointment_date,'YYYY-MM-DD') as date
    FROM appointments ORDER BY id
  `);
  console.log('\nRemaining appointments:');
  remaining.rows.forEach(r => 
    console.log(`  #${r.id} ${r.patient_name} | ${r.treatment} | ${r.date} | ${r.status}`)
  );

  await pool.end();
  console.log('\nDone!');
}

cleanup().catch(err => {
  console.error('Error:', err.message);
  pool.end();
});
