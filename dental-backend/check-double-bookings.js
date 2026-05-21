/**
 * Check for double-bookings in the database
 * Finds appointments that overlap for the same dentist on the same date
 */

require('dotenv').config();
const pool = require('./db');

async function checkDoubleBookings() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         CHECKING FOR DOUBLE-BOOKINGS                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Query all appointments grouped by date and dentist
    const result = await pool.query(
      `SELECT 
         appointment_date,
         dentist_id,
         dentist_name,
         COUNT(*) as appointment_count,
         STRING_AGG(
           CONCAT(
             patient_name, ' - ', 
             appointment_time, ' (', 
             duration_minutes, ' min, ', 
             status, ')'
           ), 
           ' | '
         ) as appointments
       FROM appointments
       WHERE status IN ('Pending', 'Approved')
       GROUP BY appointment_date, dentist_id, dentist_name
       HAVING COUNT(*) > 1
       ORDER BY appointment_date DESC, dentist_id`
    );

    if (result.rows.length === 0) {
      console.log('✅ No double-bookings found!\n');
      await pool.end();
      return;
    }

    console.log(`⚠️  Found ${result.rows.length} date/dentist combinations with multiple appointments:\n`);

    for (const row of result.rows) {
      console.log(`Date: ${row.appointment_date}`);
      console.log(`Dentist: ${row.dentist_name} (ID: ${row.dentist_id})`);
      console.log(`Count: ${row.appointment_count} appointments`);
      console.log(`Appointments: ${row.appointments}`);
      console.log('---');

      // Now check for actual overlaps
      const overlapResult = await pool.query(
        `SELECT 
           a1.id as apt1_id,
           a1.patient_name as apt1_patient,
           a1.appointment_time as apt1_time,
           a1.duration_minutes as apt1_duration,
           a1.status as apt1_status,
           a2.id as apt2_id,
           a2.patient_name as apt2_patient,
           a2.appointment_time as apt2_time,
           a2.duration_minutes as apt2_duration,
           a2.status as apt2_status
         FROM appointments a1
         JOIN appointments a2 ON 
           a1.appointment_date = a2.appointment_date AND
           a1.dentist_id = a2.dentist_id AND
           a1.id < a2.id AND
           a1.status IN ('Pending', 'Approved') AND
           a2.status IN ('Pending', 'Approved')
         WHERE 
           a1.appointment_date = $1 AND
           a1.dentist_id = $2 AND
           -- Overlap check: start1 < end2 AND end1 > start2
           (EXTRACT(EPOCH FROM a1.appointment_time) / 60)::int < 
           (EXTRACT(EPOCH FROM a2.appointment_time) / 60)::int + a2.duration_minutes AND
           (EXTRACT(EPOCH FROM a1.appointment_time) / 60)::int + a1.duration_minutes > 
           (EXTRACT(EPOCH FROM a2.appointment_time) / 60)::int
         ORDER BY a1.appointment_time`,
        [row.appointment_date, row.dentist_id]
      );

      if (overlapResult.rows.length > 0) {
        console.log(`  ❌ OVERLAPPING APPOINTMENTS FOUND:\n`);
        for (const overlap of overlapResult.rows) {
          console.log(`    Appointment 1 (ID: ${overlap.apt1_id}):`);
          console.log(`      ${overlap.apt1_patient} - ${overlap.apt1_time} (${overlap.apt1_duration} min, ${overlap.apt1_status})`);
          console.log(`    Appointment 2 (ID: ${overlap.apt2_id}):`);
          console.log(`      ${overlap.apt2_patient} - ${overlap.apt2_time} (${overlap.apt2_duration} min, ${overlap.apt2_status})`);
          console.log('');
        }
      }
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         CHECK COMPLETE                                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDoubleBookings();
