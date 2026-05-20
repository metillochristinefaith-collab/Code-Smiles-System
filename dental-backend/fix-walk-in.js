const db = require('./db');

async function fixWalkIns() {
  try {
    const result = await db.query(
      'UPDATE appointments SET status = $1, confirmation_status = $2 WHERE id IN ($3, $4) RETURNING id, patient_name, status',
      ['Approved', 'Confirmed', 101, 102]
    );
    console.log('✓ Updated appointments to Approved:');
    console.table(result.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fixWalkIns();
