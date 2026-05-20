/**
 * migrate-time-slots.js
 * 
 * Creates the time_slots table and syncs all existing appointments
 * Run this ONCE to set up dynamic slot management
 * 
 * Command: node migrate-time-slots.js
 */

require('dotenv').config();
const pool = require('./db');
const SlotManager = require('./slot-manager');

async function migrate() {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  TIME SLOTS MIGRATION');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Step 1: Create time_slots table if it doesn't exist
    console.log('[1/3] Creating time_slots table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id                SERIAL        PRIMARY KEY,
        appointment_date  DATE          NOT NULL,
        appointment_time  TIME          NOT NULL,
        slots_total       INTEGER       NOT NULL DEFAULT 4 CHECK (slots_total > 0),
        slots_available   INTEGER       NOT NULL DEFAULT 4 CHECK (slots_available >= 0 AND slots_available <= slots_total),
        slots_booked      INTEGER       NOT NULL DEFAULT 0 CHECK (slots_booked >= 0 AND slots_booked <= slots_total),
        last_updated      TIMESTAMP     NOT NULL DEFAULT NOW(),
        created_at        TIMESTAMP     NOT NULL DEFAULT NOW(),
        UNIQUE(appointment_date, appointment_time)
      );

      CREATE INDEX IF NOT EXISTS idx_time_slots_date_time ON time_slots(appointment_date, appointment_time);
    `);
    console.log('✓ time_slots table ready\n');

    // Step 2: Get all unique dates from appointments
    console.log('[2/3] Scanning existing appointments...');
    const datesResult = await pool.query(
      `SELECT DISTINCT appointment_date
       FROM appointments
       WHERE appointment_date IS NOT NULL
       ORDER BY appointment_date ASC`
    );

    const dates = datesResult.rows.map(r => r.appointment_date);
    console.log(`✓ Found ${dates.length} dates with appointments\n`);

    // Step 3: Recalculate slots for each date
    console.log('[3/3] Syncing slots with existing appointments...\n');
    
    for (const date of dates) {
      await SlotManager.recalculateSlotsForDate(date);
    }

    // Summary
    const statsResult = await pool.query(
      `SELECT 
         COUNT(*) as total_slots,
         SUM(slots_total) as total_capacity,
         SUM(slots_available) as total_available,
         SUM(slots_booked) as total_booked
       FROM time_slots`
    );

    const stats = statsResult.rows[0];

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  MIGRATION COMPLETE ✓');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\nSlot Statistics:`);
    console.log(`  Total time slots:    ${stats.total_slots}`);
    console.log(`  Total capacity:      ${stats.total_capacity} appointments`);
    console.log(`  Currently booked:    ${stats.total_booked} appointments`);
    console.log(`  Currently available: ${stats.total_available} slots`);
    console.log('\nSlots will now:');
    console.log('  ✓ PERSIST (never deleted)');
    console.log('  ✓ DECREASE when appointments are booked');
    console.log('  ✓ INCREASE when appointments are cancelled');
    console.log('  ✓ TRACK max 4 slots per time slot\n');

    await pool.end();
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
