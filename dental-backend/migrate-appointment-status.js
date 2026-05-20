/**
 * migrate-appointment-status.js
 * Updates the appointments.status column to support all role-based statuses.
 * Run once: node migrate-appointment-status.js
 */
require('dotenv').config();
const { Client } = require('pg');

async function migrate() {
  const db = new Client({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await db.connect();
  console.log('Connected to', process.env.DB_NAME);

  // 1. Widen the column to VARCHAR(50)
  await db.query(`ALTER TABLE appointments ALTER COLUMN status TYPE VARCHAR(50)`);
  console.log('✓ Column widened to VARCHAR(50)');

  // 2. Drop the old CHECK constraint (name may vary — find it first)
  const constraintRes = await db.query(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'appointments'::regclass AND contype = 'c'
    AND conname LIKE '%status%'
  `);
  for (const row of constraintRes.rows) {
    await db.query(`ALTER TABLE appointments DROP CONSTRAINT "${row.conname}"`);
    console.log(`✓ Dropped old constraint: ${row.conname}`);
  }

  // 3. Migrate existing generic statuses FIRST (before adding new constraint)
  const r1 = await db.query(`UPDATE appointments SET status = 'Cancelled by Staff'   WHERE status = 'Cancelled'`);
  const r2 = await db.query(`UPDATE appointments SET status = 'Rescheduled by Staff' WHERE status = 'Rescheduled'`);
  console.log(`✓ Migrated: ${r1.rowCount} Cancelled → Cancelled by Staff, ${r2.rowCount} Rescheduled → Rescheduled by Staff`);

  // 4. Now add the new CHECK constraint
  await db.query(`
    ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (
      status IN (
        'Pending',
        'Approved',
        'Completed',
        'Rescheduled by Staff',
        'Rescheduled by Dentist',
        'Reschedule Requested by Patient',
        'Reschedule Requested by Dentist',
        'Cancelled by Patient',
        'Cancelled by Staff',
        'Cancelled by Dentist',
        'No-show'
      )
    )
  `);
  console.log('✓ New status constraint added');

  const updated = await db.query(`SELECT COUNT(*) FROM appointments`);
  console.log(`✓ Total appointments: ${updated.rows[0].count}`);

  await db.end();
  console.log('\n✅ Migration complete! Restart your backend.');
}

migrate().catch(err => { console.error('Migration failed:', err.message); process.exit(1); });
