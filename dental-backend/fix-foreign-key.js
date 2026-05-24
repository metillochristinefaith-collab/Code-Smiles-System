require('dotenv').config();
const db = require('./db');

async function fixForeignKey() {
  const client = await db.connect();
  try {
    console.log('\n=== FIXING FOREIGN KEY CONSTRAINTS ===\n');
    
    await client.query('BEGIN');
    
    // Step 1: Drop the old foreign key constraint
    console.log('Step 1: Dropping old foreign key constraints...\n');
    
    try {
      await client.query(`ALTER TABLE appointments DROP CONSTRAINT IF EXISTS fk_appointments_dentist`);
      console.log('✓ Dropped fk_appointments_dentist');
    } catch (e) {
      console.log('  (constraint may not exist)');
    }
    
    try {
      await client.query(`ALTER TABLE prescriptions DROP CONSTRAINT IF EXISTS prescriptions_dentist_id_fkey`);
      console.log('✓ Dropped prescriptions_dentist_id_fkey');
    } catch (e) {
      console.log('  (constraint may not exist)');
    }
    
    try {
      await client.query(`ALTER TABLE treatment_plans DROP CONSTRAINT IF EXISTS treatment_plans_dentist_id_fkey`);
      console.log('✓ Dropped treatment_plans_dentist_id_fkey');
    } catch (e) {
      console.log('  (constraint may not exist)');
    }
    
    try {
      await client.query(`ALTER TABLE clinical_notes DROP CONSTRAINT IF EXISTS clinical_notes_dentist_id_fkey`);
      console.log('✓ Dropped clinical_notes_dentist_id_fkey');
    } catch (e) {
      console.log('  (constraint may not exist)');
    }
    
    // Step 2: Add new foreign key constraints pointing to users table
    console.log('\n\nStep 2: Adding new foreign key constraints to users table...\n');
    
    await client.query(
      `ALTER TABLE appointments 
       ADD CONSTRAINT fk_appointments_dentist 
       FOREIGN KEY (dentist_id) REFERENCES users(id) ON DELETE SET NULL`
    );
    console.log('✓ Added fk_appointments_dentist → users(id)');
    
    await client.query(
      `ALTER TABLE prescriptions 
       ADD CONSTRAINT prescriptions_dentist_id_fkey 
       FOREIGN KEY (dentist_id) REFERENCES users(id) ON DELETE SET NULL`
    );
    console.log('✓ Added prescriptions_dentist_id_fkey → users(id)');
    
    await client.query(
      `ALTER TABLE treatment_plans 
       ADD CONSTRAINT treatment_plans_dentist_id_fkey 
       FOREIGN KEY (dentist_id) REFERENCES users(id) ON DELETE SET NULL`
    );
    console.log('✓ Added treatment_plans_dentist_id_fkey → users(id)');
    
    await client.query(
      `ALTER TABLE clinical_notes 
       ADD CONSTRAINT clinical_notes_dentist_id_fkey 
       FOREIGN KEY (dentist_id) REFERENCES users(id) ON DELETE SET NULL`
    );
    console.log('✓ Added clinical_notes_dentist_id_fkey → users(id)');
    
    await client.query('COMMIT');
    
    console.log('\n✓ Foreign key constraints fixed!\n');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

fixForeignKey();
