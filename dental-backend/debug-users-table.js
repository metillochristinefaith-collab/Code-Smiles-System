const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Dububear101523',
  database: 'code_smiles_db',
});

async function debugUsersTable() {
  try {
    console.log('=== USERS TABLE STRUCTURE ===\n');

    // Get column info
    const columnsResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    console.log('Columns in users table:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Get all users
    console.log('\n=== ALL USERS ===\n');
    const usersResult = await pool.query('SELECT * FROM users;');
    console.log(`Found ${usersResult.rows.length} users:\n`);
    usersResult.rows.forEach(u => {
      console.log(`ID: ${u.id}, Email: ${u.email}, Role: ${u.role}`);
    });

    // Get dentist table structure
    console.log('\n=== DENTIST TABLE STRUCTURE ===\n');
    const dentistColumnsResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'dentist'
      ORDER BY ordinal_position;
    `);
    console.log('Columns in dentist table:');
    dentistColumnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Get all dentists with full details
    console.log('\n=== ALL DENTISTS ===\n');
    const dentistsResult = await pool.query('SELECT * FROM dentist;');
    console.log(`Found ${dentistsResult.rows.length} dentists:\n`);
    dentistsResult.rows.forEach(d => {
      console.log(JSON.stringify(d, null, 2));
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugUsersTable();
