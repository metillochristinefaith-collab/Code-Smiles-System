require('dotenv').config();
const db = require('./db');

async function checkMetillo() {
  try {
    const result = await db.query(
      `SELECT * FROM users 
       WHERE first_name ILIKE '%metillo%' 
       OR last_name ILIKE '%metillo%' 
       OR email ILIKE '%metillo%'`
    );
    
    console.log('Found users:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    if (result.rows.length === 0) {
      console.log('\n❌ No users found matching "metillo"');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkMetillo();
