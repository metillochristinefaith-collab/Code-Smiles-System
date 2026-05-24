const pg = require('pg');
const db = new pg.Pool({ 
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'code_smiles_db'
});

async function checkDatabase() {
  try {
    // Check patient_profiles columns
    const columnsResult = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'patient_profiles' 
      ORDER BY ordinal_position;
    `);
    
    console.log('✓ patient_profiles columns:');
    columnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    // Check constraints
    const constraintsResult = await db.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'patient_profiles';
    `);
    
    console.log('\n✓ patient_profiles constraints:');
    constraintsResult.rows.forEach(row => {
      console.log(`  - ${row.constraint_name}: ${row.constraint_type}`);
    });
    
    // Check if updated_at column exists
    const hasUpdatedAt = columnsResult.rows.some(r => r.column_name === 'updated_at');
    console.log(`\n✓ Has updated_at column: ${hasUpdatedAt ? 'YES' : 'NO'}`);
    
    // Check if unique constraint on user_id exists
    const hasUniqueConstraint = constraintsResult.rows.some(r => 
      r.constraint_type === 'UNIQUE' && r.constraint_name.includes('user_id')
    );
    console.log(`✓ Has unique constraint on user_id: ${hasUniqueConstraint ? 'YES' : 'NO'}`);
    
    db.end();
  } catch (err) {
    console.error('Error:', err.message);
    db.end();
    process.exit(1);
  }
}

checkDatabase();
