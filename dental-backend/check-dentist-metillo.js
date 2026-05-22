require('dotenv').config();
const db = require('./db');

async function checkDentist() {
  try {
    // Check dentists table
    const dentistResult = await db.query(
      `SELECT * FROM dentists 
       WHERE first_name ILIKE '%metillo%' 
       OR last_name ILIKE '%metillo%' 
       OR email ILIKE '%metillo%'`
    );
    
    console.log('Dentists found:');
    console.log(JSON.stringify(dentistResult.rows, null, 2));
    
    // Also check if there's a user_id link
    const userResult = await db.query(
      `SELECT * FROM users 
       WHERE id = 24`
    );
    
    console.log('\nUser record (ID 24):');
    console.log(JSON.stringify(userResult.rows, null, 2));
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkDentist();
