require('dotenv').config();
const db = require('./db');

async function addMissingColumns() {
  try {
    console.log('Adding missing columns to staff table...\n');

    // Add columns to staff table
    const staffColumns = [
      { name: 'gender', type: "VARCHAR(20) CHECK (gender IN ('Male','Female','Other','Prefer not to say'))" },
      { name: 'address', type: 'TEXT' },
      { name: 'date_of_birth', type: 'DATE' },
      { name: 'emergency_contact_name', type: 'VARCHAR(100)' },
      { name: 'emergency_contact_phone', type: 'VARCHAR(20)' },
      { name: 'bio', type: 'TEXT' },
      { name: 'work_schedule', type: "VARCHAR(255) DEFAULT 'Mon – Fri · 8:00 AM – 5:00 PM'" },
    ];

    for (const col of staffColumns) {
      try {
        await db.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`✓ Added ${col.name} to staff table`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`  ${col.name} already exists`);
        } else {
          throw err;
        }
      }
    }

    console.log('\nAdding missing columns to dentist table...\n');

    // Add columns to dentist table
    const dentistColumns = [
      { name: 'gender', type: "VARCHAR(20) CHECK (gender IN ('Male','Female','Other','Prefer not to say'))" },
      { name: 'department', type: 'VARCHAR(100)' },
      { name: 'education', type: 'TEXT' },
      { name: 'address', type: 'TEXT' },
      { name: 'date_of_birth', type: 'DATE' },
      { name: 'emergency_contact_name', type: 'VARCHAR(100)' },
      { name: 'emergency_contact_phone', type: 'VARCHAR(20)' },
    ];

    for (const col of dentistColumns) {
      try {
        await db.query(`ALTER TABLE dentist ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`✓ Added ${col.name} to dentist table`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`  ${col.name} already exists`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n✅ All missing columns added successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

addMissingColumns();
