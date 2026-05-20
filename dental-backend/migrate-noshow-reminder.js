/**
 * migrate-noshow-reminder.js
 * Adds reminder tracking, confirmation status, and reliability score columns.
 * Run once: node migrate-noshow-reminder.js
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

  // ── appointments: add reminder + confirmation columns ──────────────────────
  await db.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN NOT NULL DEFAULT FALSE`);
  await db.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_3h_sent  BOOLEAN NOT NULL DEFAULT FALSE`);
  await db.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(20) DEFAULT 'Not Confirmed'`);

  // Add CHECK constraint for confirmation_status if not exists
  const ccExists = await db.query(`
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'appointments'::regclass AND conname = 'appointments_confirmation_status_check'
  `);
  if (ccExists.rowCount === 0) {
    await db.query(`
      ALTER TABLE appointments ADD CONSTRAINT appointments_confirmation_status_check
      CHECK (confirmation_status IN ('Not Confirmed','Confirmed','Reschedule Requested'))
    `);
  }
  console.log('✓ appointments: reminder + confirmation columns added');

  // ── patient_profiles: add reliability_score ────────────────────────────────
  await db.query(`ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS reliability_score INTEGER NOT NULL DEFAULT 0`);
  console.log('✓ patient_profiles: reliability_score column added');

  // ── notifications: add appointment_id for reminder linking ─────────────────
  await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL`);
  console.log('✓ notifications: appointment_id column added');

  // ── users: add email verification + password reset columns ────────────────
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(128)`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(128)`);
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP`);
  // Mark existing Staff/Admin accounts as verified
  await db.query(`UPDATE users SET is_verified = TRUE WHERE role IN ('Staff', 'Admin') AND is_verified = FALSE`);
  console.log('✓ users: auth columns added, Staff/Admin accounts marked verified');

  await db.end();
  console.log('\n✅ Migration complete! Restart your backend.');
}

migrate().catch(err => { console.error('Migration failed:', err.message); process.exit(1); });
