const { Pool } = require('pg');
require('dotenv').config();

const db = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function fixNullPatientIds() {
  const client = await db.connect();
  try {
    console.log('Starting fix for NULL patient_ids...\n');

    // Step 1: Find appointments with NULL patient_id
    const nullAppointments = await client.query(
      `SELECT id, patient_name, email, phone, created_at 
       FROM appointments 
       WHERE patient_id IS NULL 
       ORDER BY created_at DESC`
    );

    console.log(`Found ${nullAppointments.rows.length} appointments with NULL patient_id\n`);

    if (nullAppointments.rows.length === 0) {
      console.log('✓ No appointments with NULL patient_id found. Database is clean!');
      return;
    }

    // Step 2: Try to match appointments to users by email
    let matched = 0;
    let unmatched = 0;

    for (const appt of nullAppointments.rows) {
      console.log(`Processing: ${appt.patient_name} (${appt.email})`);

      // Try to find user by email
      const userResult = await client.query(
        `SELECT id FROM users WHERE email = $1 AND role = 'Patient'`,
        [appt.email]
      );

      if (userResult.rows.length > 0) {
        const userId = userResult.rows[0].id;
        
        // Update appointment with patient_id
        await client.query(
          `UPDATE appointments SET patient_id = $1 WHERE id = $2`,
          [userId, appt.id]
        );
        
        console.log(`  ✓ Matched to user ID: ${userId}`);
        matched++;
      } else {
        console.log(`  ✗ No matching user found for email: ${appt.email}`);
        unmatched++;
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total appointments with NULL patient_id: ${nullAppointments.rows.length}`);
    console.log(`Successfully matched: ${matched}`);
    console.log(`Could not match: ${unmatched}`);

    // Step 3: Show remaining NULL patient_ids
    const stillNull = await client.query(
      `SELECT id, patient_name, email FROM appointments WHERE patient_id IS NULL`
    );

    if (stillNull.rows.length > 0) {
      console.log(`\n⚠️  Still have ${stillNull.rows.length} appointments with NULL patient_id:`);
      stillNull.rows.forEach(appt => {
        console.log(`  - ID: ${appt.id}, Name: ${appt.patient_name}, Email: ${appt.email}`);
      });
      console.log('\nThese appointments may be from walk-in patients or unregistered users.');
    } else {
      console.log(`\n✓ All appointments now have valid patient_id!`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await db.end();
  }
}

fixNullPatientIds();
