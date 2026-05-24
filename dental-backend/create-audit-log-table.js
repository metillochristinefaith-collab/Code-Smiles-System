const pg = require('pg');
const db = new pg.Pool({ 
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'code_smiles_db'
});

async function createAuditLogTable() {
  try {
    console.log('Creating file_access_log table...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS file_access_log (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        dentist_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        file_id INTEGER NOT NULL REFERENCES patient_vault_records(id) ON DELETE CASCADE,
        accessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        action VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('✓ file_access_log table created');
    
    // Create indexes
    console.log('Creating indexes...');
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_file_access_log_patient ON file_access_log(patient_id);
    `);
    console.log('✓ Index on patient_id created');
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_file_access_log_dentist ON file_access_log(dentist_id);
    `);
    console.log('✓ Index on dentist_id created');
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_file_access_log_file ON file_access_log(file_id);
    `);
    console.log('✓ Index on file_id created');
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_file_access_log_accessed ON file_access_log(accessed_at);
    `);
    console.log('✓ Index on accessed_at created');
    
    console.log('\n✅ Audit log table setup complete!');
    db.end();
  } catch (err) {
    console.error('Error:', err.message);
    db.end();
    process.exit(1);
  }
}

createAuditLogTable();
