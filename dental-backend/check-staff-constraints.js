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
    // Check staff_profiles columns
    const staffColumnsResult = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'staff_profiles' 
      ORDER BY ordinal_position;
    `);
    
    console.log('✓ staff_profiles columns:');
    staffColumnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    // Check staff_profiles constraints
    const staffConstraintsResult = await db.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'staff_profiles';
    `);
    
    console.log('\n✓ staff_profiles constraints:');
    staffConstraintsResult.rows.forEach(row => {
      console.log(`  - ${row.constraint_name}: ${row.constraint_type}`);
    });
    
    // Check dentist table columns
    const dentistColumnsResult = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'dentist' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n✓ dentist columns:');
    dentistColumnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    // Check dentist constraints
    const dentistConstraintsResult = await db.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'dentist';
    `);
    
    console.log('\n✓ dentist constraints:');
    dentistConstraintsResult.rows.forEach(row => {
      console.log(`  - ${row.constraint_name}: ${row.constraint_type}`);
    });
    
    // Check if updated_at column exists in both
    const hasStaffUpdatedAt = staffColumnsResult.rows.some(r => r.column_name === 'updated_at');
    const hasDentistUpdatedAt = dentistColumnsResult.rows.some(r => r.column_name === 'updated_at');
    
    console.log(`\n✓ staff_profiles has updated_at: ${hasStaffUpdatedAt ? 'YES' : 'NO'}`);
    console.log(`✓ dentist has updated_at: ${hasDentistUpdatedAt ? 'YES' : 'NO'}`);
    
    db.end();
  } catch (err) {
    console.error('Error:', err.message);
    db.end();
    process.exit(1);
  }
}

checkDatabase();
