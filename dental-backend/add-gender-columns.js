require('dotenv').config();
const db = require('./db');

async function addGenderColumns() {
  try {
    console.log('Adding gender column to staff_profiles table...');
    await db.query(`
      ALTER TABLE staff_profiles 
      ADD COLUMN IF NOT EXISTS gender VARCHAR(20) 
      CHECK (gender IN ('Male','Female','Other','Prefer not to say'))
    `);
    console.log('✓ Added gender to staff_profiles');

    console.log('Adding gender column to dentist table...');
    await db.query(`
      ALTER TABLE dentist 
      ADD COLUMN IF NOT EXISTS gender VARCHAR(20) 
      CHECK (gender IN ('Male','Female','Other','Prefer not to say'))
    `);
    console.log('✓ Added gender to dentist');

    console.log('✅ All gender columns added successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

addGenderColumns();
