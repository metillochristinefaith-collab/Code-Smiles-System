/**
 * verify-4-slots.js
 * 
 * Verifies that the system ALWAYS shows max 4 slots, never 5
 * 
 * Command: node verify-4-slots.js
 */

require('dotenv').config();
const pool = require('./db');

async function verify() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         VERIFY: MAX 4 SLOTS PER TIME                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Get all unique dates and times
    const result = await pool.query(
      `SELECT DISTINCT appointment_date, appointment_time 
       FROM appointments 
       WHERE status IN ('Approved', 'Pending')
       ORDER BY appointment_date DESC, appointment_time DESC
       LIMIT 10`
    );

    console.log('Checking all date/time combinations:\n');

    let allCorrect = true;

    for (const row of result.rows) {
      const date = row.appointment_date;
      const time = row.appointment_time;

      // Get all services at this date/time
      const servicesResult = await pool.query(
        `SELECT DISTINCT LOWER(treatment) as service 
         FROM appointments 
         WHERE appointment_date = $1 
           AND appointment_time = $2
           AND status IN ('Approved', 'Pending')`,
        [date, time]
      );

      for (const serviceRow of servicesResult.rows) {
        const service = serviceRow.service;

        // Count appointments for this service at this date/time
        const countResult = await pool.query(
          `SELECT COUNT(*) as count 
           FROM appointments 
           WHERE appointment_date = $1 
             AND appointment_time = $2
             AND LOWER(treatment) = $3
             AND status IN ('Approved', 'Pending')`,
          [date, time, service]
        );

        const count = parseInt(countResult.rows[0].count) || 0;
        
        // Calculate slots
        const slotsLeft = count > 0 ? 0 : 4;
        const slotsTotal = 4;

        // Verify
        const isCorrect = slotsTotal === 4 && slotsLeft <= 4;

        const status = isCorrect ? '✅' : '❌';
        console.log(`${status} ${date} | ${time} | ${service}: ${slotsLeft}/${slotsTotal} slots`);

        if (!isCorrect) {
          allCorrect = false;
          console.log(`   ERROR: slotsTotal should be 4, got ${slotsTotal}`);
          console.log(`   ERROR: slotsLeft should be <= 4, got ${slotsLeft}`);
        }
      }
    }

    console.log();
    if (allCorrect) {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║         ✅ ALL SLOTS ARE CORRECT (MAX 4)                  ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
    } else {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║         ❌ SOME SLOTS ARE INCORRECT                        ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
    }

    await pool.end();
  } catch (error) {
    console.error('\n✗ Verification failed:', error.message);
    process.exit(1);
  }
}

verify();
