const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Dububear101523',
  database: 'code_smiles_db',
});

async function debugStaffBooking() {
  try {
    console.log('=== DEBUGGING STAFF BOOKING ISSUE ===\n');

    // 1. Check dentists table
    console.log('1. Checking dentists table...');
    const dentistsResult = await pool.query('SELECT * FROM dentists;');
    console.log(`Found ${dentistsResult.rows.length} dentists:`);
    dentistsResult.rows.forEach(d => {
      console.log(`  - ID: ${d.id}, Name: ${d.name}, Specialization: ${d.specialization}`);
    });

    // 2. Check services table
    console.log('\n2. Checking services table...');
    const servicesResult = await pool.query('SELECT * FROM services;');
    console.log(`Found ${servicesResult.rows.length} services:`);
    servicesResult.rows.forEach(s => {
      console.log(`  - ID: ${s.id}, Name: ${s.name}, Duration: ${s.duration_minutes} min, Dentist ID: ${s.dentist_id}`);
    });

    // 3. Check dentist_services table
    console.log('\n3. Checking dentist_services table...');
    const dentistServicesResult = await pool.query('SELECT * FROM dentist_services;');
    console.log(`Found ${dentistServicesResult.rows.length} dentist_services:`);
    dentistServicesResult.rows.forEach(ds => {
      console.log(`  - Dentist ID: ${ds.dentist_id}, Service ID: ${ds.service_id}`);
    });

    // 4. Check if appointments table has dentist_id
    console.log('\n4. Checking appointments with dentist_id...');
    const appointmentsResult = await pool.query(`
      SELECT id, patient_name, dentist_name, dentist_id, appointment_date, appointment_time, status
      FROM appointments
      LIMIT 5;
    `);
    console.log(`Sample appointments:`);
    appointmentsResult.rows.forEach(a => {
      console.log(`  - ID: ${a.id}, Patient: ${a.patient_name}, Dentist: ${a.dentist_name} (ID: ${a.dentist_id}), Date: ${a.appointment_date}, Time: ${a.appointment_time}, Status: ${a.status}`);
    });

    // 5. Check if there's a users table with dentist role
    console.log('\n5. Checking users table for dentists...');
    const usersResult = await pool.query(`
      SELECT id, username, email, role
      FROM users
      WHERE role = 'dentist'
      LIMIT 5;
    `);
    console.log(`Found ${usersResult.rows.length} dentist users:`);
    usersResult.rows.forEach(u => {
      console.log(`  - ID: ${u.id}, Username: ${u.username}, Email: ${u.email}, Role: ${u.role}`);
    });

    // 6. Test the available-times query manually
    console.log('\n6. Testing available-times query manually...');
    const testDate = '2026-05-20';
    const testService = 'Wisdom Tooth Removal';
    
    // First, find which dentist handles this service
    const serviceResult = await pool.query(`
      SELECT s.id, s.name, s.dentist_id, d.name as dentist_name
      FROM services s
      LEFT JOIN dentists d ON s.dentist_id = d.id
      WHERE s.name = $1;
    `, [testService]);
    
    if (serviceResult.rows.length === 0) {
      console.log(`  ✗ Service "${testService}" not found in database`);
    } else {
      const service = serviceResult.rows[0];
      console.log(`  ✓ Service found: ${service.name}, Dentist: ${service.dentist_name} (ID: ${service.dentist_id})`);
      
      // Now check appointments for this dentist on this date
      const appointmentsForDateResult = await pool.query(`
        SELECT id, appointment_time, duration_minutes, treatment, status
        FROM appointments
        WHERE appointment_date = $1
          AND dentist_id = $2
          AND status IN ('Approved', 'Pending')
        ORDER BY appointment_time ASC;
      `, [testDate, service.dentist_id]);
      
      console.log(`  ✓ Found ${appointmentsForDateResult.rows.length} appointments for ${service.dentist_name} on ${testDate}`);
      appointmentsForDateResult.rows.forEach(a => {
        console.log(`    - ${a.appointment_time} (${a.treatment}, ${a.duration_minutes} min, ${a.status})`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

debugStaffBooking();
