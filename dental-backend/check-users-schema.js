require('dotenv').config();
const db = require('./db');

async function checkUsersSchema() {
  try {
    // Get the schema of the users table
    const result = await db.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = 'users'
       ORDER BY ordinal_position`
    );
    
    console.log('Users table schema:');
    console.log('─'.repeat(80));
    result.rows.forEach(col => {
      console.log(`${col.column_name.padEnd(25)} | ${col.data_type.padEnd(15)} | Nullable: ${col.is_nullable.padEnd(3)} | Default: ${col.column_default || 'none'}`);
    });
    
    // Get sample data
    console.log('\n\nSample users (first 5):');
    console.log('─'.repeat(80));
    const sampleResult = await db.query(
      `SELECT id, first_name, last_name, email, role, status FROM users LIMIT 5`
    );
    
    console.log(JSON.stringify(sampleResult.rows, null, 2));
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkUsersSchema();
