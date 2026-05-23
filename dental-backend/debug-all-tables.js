const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Dububear101523',
  database: 'code_smiles_db',
});

async function debugAllTables() {
  try {
    console.log('=== ALL TABLES IN DATABASE ===\n');

    // Get all tables
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`Found ${result.rows.length} tables:\n`);
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // For each table, show column count
    console.log('\n=== TABLE DETAILS ===\n');
    for (const row of result.rows) {
      const colResult = await pool.query(`
        SELECT COUNT(*) as col_count
        FROM information_schema.columns
        WHERE table_name = $1;
      `, [row.table_name]);
      
      const rowResult = await pool.query(`SELECT COUNT(*) as row_count FROM "${row.table_name}";`);
      
      console.log(`${row.table_name}:`);
      console.log(`  - Columns: ${colResult.rows[0].col_count}`);
      console.log(`  - Rows: ${rowResult.rows[0].row_count}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugAllTables();
