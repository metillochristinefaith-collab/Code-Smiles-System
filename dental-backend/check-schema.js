require('dotenv').config();
const db = require('./db');

async function checkSchema() {
  try {
    // Get all tables
    const tablesResult = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public'`
    );
    
    console.log('Tables in database:');
    tablesResult.rows.forEach(row => console.log('  -', row.table_name));
    
    // Check if there's a staff or dentist-related table
    const staffResult = await db.query(
      `SELECT * FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND (table_name ILIKE '%staff%' OR table_name ILIKE '%dentist%')`
    );
    
    console.log('\nStaff/Dentist related tables:');
    if (staffResult.rows.length === 0) {
      console.log('  None found');
    } else {
      staffResult.rows.forEach(row => console.log('  -', row.table_name));
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkSchema();
