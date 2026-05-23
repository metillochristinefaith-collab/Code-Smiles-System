/**
 * Fix service_dentist_mapping foreign key constraint
 * The table was created with REFERENCES dentist(id) but should be dentist(dentist_id)
 */

const db = require('./db');

async function fixServiceDentistMapping() {
  const client = await db.connect();
  
  try {
    console.log('[FIX] Starting service_dentist_mapping foreign key fix...');
    
    // Step 1: Drop the old constraint
    console.log('[FIX] Dropping old foreign key constraint...');
    await client.query(`
      ALTER TABLE service_dentist_mapping
      DROP CONSTRAINT IF EXISTS service_dentist_mapping_dentist_id_fkey
    `);
    
    // Step 2: Add the correct constraint
    console.log('[FIX] Adding correct foreign key constraint...');
    await client.query(`
      ALTER TABLE service_dentist_mapping
      ADD CONSTRAINT service_dentist_mapping_dentist_id_fkey
      FOREIGN KEY (dentist_id) REFERENCES dentist(dentist_id) ON DELETE CASCADE
    `);
    
    console.log('[FIX] ✅ Foreign key constraint fixed successfully!');
    
    // Verify the fix
    const result = await client.query(`
      SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'service_dentist_mapping' AND column_name = 'dentist_id'
    `);
    
    if (result.rows.length > 0) {
      const constraint = result.rows[0];
      console.log('[FIX] Verified constraint:');
      console.log(`  - Constraint: ${constraint.constraint_name}`);
      console.log(`  - Table: ${constraint.table_name}`);
      console.log(`  - Column: ${constraint.column_name}`);
      console.log(`  - References: ${constraint.foreign_table_name}(${constraint.foreign_column_name})`);
    }
    
  } catch (error) {
    console.error('[FIX] Error fixing foreign key:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run the fix
fixServiceDentistMapping()
  .then(() => {
    console.log('[FIX] Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('[FIX] Failed:', err.message);
    process.exit(1);
  });
