const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Dububear101523',
  database: 'code_smiles_db',
});

async function debugDentistTable() {
  try {
    console.log('=== DENTIST TABLE ANALYSIS ===\n');

    // Get all dentists
    const result = await pool.query('SELECT * FROM dentist;');
    console.log(`Found ${result.rows.length} dentists:\n`);
    result.rows.forEach(d => {
      console.log(`ID: ${d.id}`);
      console.log(`  Name: ${d.name}`);
      console.log(`  Email: ${d.email}`);
      console.log(`  Specialization: ${d.specialization}`);
      console.log(`  User ID: ${d.user_id}`);
      console.log('');
    });

    // Check the users table for dentist users
    console.log('\n=== USERS TABLE (Dentist Role) ===\n');
    const usersResult = await pool.query(`
      SELECT id, username, email, role
      FROM users
      WHERE role = 'dentist'
      ORDER BY id;
    `);
    console.log(`Found ${usersResult.rows.length} dentist users:\n`);
    usersResult.rows.forEach(u => {
      console.log(`ID: ${u.id}, Username: ${u.username}, Email: ${u.email}, Role: ${u.role}`);
    });

    // Check appointments to see what dentist_ids are being used
    console.log('\n=== APPOINTMENTS DENTIST_ID USAGE ===\n');
    const appointmentsResult = await pool.query(`
      SELECT DISTINCT dentist_id, dentist_name
      FROM appointments
      ORDER BY dentist_id;
    `);
    console.log(`Dentist IDs used in appointments:\n`);
    appointmentsResult.rows.forEach(a => {
      console.log(`  Dentist ID: ${a.dentist_id}, Name: ${a.dentist_name}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugDentistTable();
