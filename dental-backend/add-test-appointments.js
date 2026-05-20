const pool = require('./db');

async function addTestAppointments() {
  try {
    // Get today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const testDate = `${year}-${month}-${day}`;

    console.log(`Adding test appointments for date: ${testDate}`);

    // Add a few appointments to create gaps
    const appointments = [
      {
        patient_id: 1,
        patient_name: 'John Doe',
        phone: '09123456789',
        email: 'john@example.com',
        treatment: 'Dental Cleaning',
        dentist_id: 1,
        appointment_date: testDate,
        appointment_time: '09:00',
        duration_minutes: 55, // 45 min service + 10 min buffer
        status: 'Approved'
      },
      {
        patient_id: 2,
        patient_name: 'Jane Smith',
        phone: '09987654321',
        email: 'jane@example.com',
        treatment: 'Tooth Fillings',
        dentist_id: 2,
        appointment_date: testDate,
        appointment_time: '10:00',
        duration_minutes: 70, // 60 min service + 10 min buffer
        status: 'Approved'
      },
      {
        patient_id: 3,
        patient_name: 'Bob Johnson',
        phone: '09111111111',
        email: 'bob@example.com',
        treatment: 'Oral Consultation',
        dentist_id: 3,
        appointment_date: testDate,
        appointment_time: '14:00',
        duration_minutes: 25, // 15 min service + 10 min buffer
        status: 'Pending'
      }
    ];

    for (const apt of appointments) {
      const result = await pool.query(
        `INSERT INTO appointments 
         (patient_id, patient_name, phone, email, treatment, dentist_id, 
          appointment_date, appointment_time, duration_minutes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [apt.patient_id, apt.patient_name, apt.phone, apt.email, apt.treatment, 
         apt.dentist_id, apt.appointment_date, apt.appointment_time, 
         apt.duration_minutes, apt.status]
      );
      console.log(`✓ Added appointment ID: ${result.rows[0].id}`);
    }

    // Check what we have
    const check = await pool.query(
      `SELECT COUNT(*) as count FROM appointments 
       WHERE appointment_date = $1 AND status IN ('Approved', 'Pending')`,
      [testDate]
    );
    console.log(`\nTotal appointments for ${testDate}: ${check.rows[0].count}`);

    // Show the appointments
    const list = await pool.query(
      `SELECT dentist_id, appointment_time, duration_minutes, treatment, status 
       FROM appointments 
       WHERE appointment_date = $1 AND status IN ('Approved', 'Pending')
       ORDER BY dentist_id, appointment_time`,
      [testDate]
    );
    console.log('\nAppointments:');
    list.rows.forEach(row => {
      console.log(`  D${row.dentist_id}: ${row.appointment_time} (${row.duration_minutes} min) - ${row.treatment} [${row.status}]`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addTestAppointments();
