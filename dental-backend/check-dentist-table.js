require('dotenv').config();
const db = require('./db');

async function checkDentistTable() {
  try {
    console.log('\n=== CHECKING DENTIST TABLE ===\n');
    
    // Check if dentist table exists
    const tableExists = await db.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'dentist'
      )`
    );
    
    console.log(`Dentist table exists: ${tableExists.rows[0].exists}\n`);
    
    if (tableExists.rows[0].exists) {
      const dentists = await db.query(`SELECT * FROM dentist`);
      console.log(`Found ${dentists.rowCount} records in dentist table:\n`);
      console.log(dentists.rows);
    }
    
    // Check foreign key constraints
    console.log('\n=== CHECKING FOREIGN KEY CONSTRAINTS ===\n');
    
    const constraints = await db.query(
      `SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name
       FROM information_schema.key_column_usage
       WHERE table_name = 'appointments' AND column_name = 'dentist_id'`
    );
    
    console.log(`Found ${constraints.rowCount} constraints on appointments.dentist_id:\n`);
    constraints.rows.forEach(c => {
      console.log(`  Constraint: ${c.constraint_name}`);
      console.log(`  References: ${c.foreign_table_name}(${c.foreign_column_name})`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkDentistTable();
