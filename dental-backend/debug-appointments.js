const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Dububear101523',
  database: 'code_smiles_db',
});

async function debugAppointments() {
  try {
    console.log('=== DEBUGGING APPOINTMENTS TABLE ===\n');

    // 1. Check if table exists
    console.log('1. Checking if appointments table exists...');
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'appointments'
      );
    `);
    console.log('Table exists:', tableExists.rows[0].exists);

    if (!tableExists.rows[0].exists) {
      console.log('❌ Appointments table does NOT exist!');
      await pool.end();
      return;
    }

    // 2. Get table columns
    console.log('\n2. Checking table columns...');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'appointments'
      ORDER BY ordinal_position;
    `);
    console.log('Columns in appointments table:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });

    // 3. Check for required columns
    console.log('\n3. Checking for required columns...');
    const requiredColumns = ['appointment_date', 'appointment_time', 'treatment', 'dentist_name', 'status'];
    const existingColumnNames = columns.rows.map(col => col.column_name);
    
    requiredColumns.forEach(col => {
      const exists = existingColumnNames.includes(col);
      console.log(`  ${exists ? '✓' : '✗'} ${col}`);
    });

    // 4. Count appointments
    console.log('\n4. Checking appointments data...');
    const count = await pool.query('SELECT COUNT(*) FROM appointments;');
    console.log(`Total appointments: ${count.rows[0].count}`);

    // 5. Show sample appointments
    if (count.rows[0].count > 0) {
      console.log('\n5. Sample appointments (first 5):');
      const sample = await pool.query('SELECT * FROM appointments LIMIT 5;');
      console.log(JSON.stringify(sample.rows, null, 2));
    }

    // 6. Check table structure
    console.log('\n6. Full table structure:');
    const structure = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'appointments'
      ORDER BY ordinal_position;
    `);
    console.log(JSON.stringify(structure.rows, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugAppointments();
