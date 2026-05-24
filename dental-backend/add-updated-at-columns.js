const db = require('./db');

async function addColumns() {
  try {
    console.log('Adding updated_at columns to profile tables...\n');
    
    // Add to patient_profiles
    console.log('1. Adding updated_at to patient_profiles...');
    await db.query(`
      ALTER TABLE patient_profiles 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);
    console.log('   ✅ Done');
    
    // Add to staff (if exists)
    console.log('2. Checking if staff table exists...');
    const staffExists = await db.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'staff'
      )
    `);
    
    if (staffExists.rows[0].exists) {
      console.log('   Adding updated_at to staff...');
      await db.query(`
        ALTER TABLE staff 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
      `);
      console.log('   ✅ Done');
    } else {
      console.log('   ⚠️  staff table does not exist');
    }
    
    // Add to dentist (if exists)
    console.log('3. Checking if dentist table exists...');
    const dentistExists = await db.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'dentist'
      )
    `);
    
    if (dentistExists.rows[0].exists) {
      console.log('   Adding updated_at to dentist...');
      await db.query(`
        ALTER TABLE dentist 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
      `);
      console.log('   ✅ Done');
    } else {
      console.log('   ⚠️  dentist table does not exist');
    }
    
    // Create indexes
    console.log('\n4. Creating indexes...');
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_patient_profiles_updated 
      ON patient_profiles(updated_at DESC)
    `);
    console.log('   ✅ Index on patient_profiles created');
    
    console.log('\n✅ All columns and indexes added successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

addColumns();
