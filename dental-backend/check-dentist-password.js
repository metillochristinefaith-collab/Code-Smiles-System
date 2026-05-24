require('dotenv').config();
const db = require('./db');

async function check() {
  try {
    const result = await db.query(
      `SELECT id, email, password FROM users WHERE email = 'eduria@codesmiles.com'`
    );
    
    if (result.rows.length === 0) {
      console.log('User not found');
      process.exit(1);
    }
    
    const user = result.rows[0];
    console.log('User found:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password hash: ${user.password.substring(0, 20)}...`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
