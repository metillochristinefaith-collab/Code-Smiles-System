const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  password: 'Dububear101523',
  host: 'localhost',
  port: 5432,
  database: 'code_smiles_db'
});

async function queryUsers() {
  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL database\n');

    // Check total number of users
    const totalResult = await client.query('SELECT COUNT(*) as total FROM users');
    const totalUsers = totalResult.rows[0].total;
    console.log(`Total users in database: ${totalUsers}\n`);

    // Query for specific user with email 'acojedo@codesmiles.com'
    console.log('--- Searching for acojedo@codesmiles.com ---');
    const specificResult = await client.query(
      "SELECT * FROM users WHERE email = $1",
      ['acojedo@codesmiles.com']
    );
    
    if (specificResult.rows.length > 0) {
      console.log('✓ User found:');
      console.log(JSON.stringify(specificResult.rows[0], null, 2));
    } else {
      console.log('✗ User with email acojedo@codesmiles.com NOT found\n');
    }

    // Query for all users with 'acojedo' in email or name
    console.log('\n--- Searching for users with "acojedo" in email or name ---');
    const searchResult = await client.query(
      "SELECT * FROM users WHERE email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1",
      ['%acojedo%']
    );
    
    if (searchResult.rows.length > 0) {
      console.log(`Found ${searchResult.rows.length} user(s):`);
      searchResult.rows.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log(JSON.stringify(user, null, 2));
      });
    } else {
      console.log('✗ No users found with "acojedo" in email or name\n');
    }

    // Show all users if database is not too large
    if (totalUsers > 0 && totalUsers <= 20) {
      console.log('\n--- All users in database ---');
      const allResult = await client.query('SELECT * FROM users ORDER BY id');
      allResult.rows.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log(JSON.stringify(user, null, 2));
      });
    } else if (totalUsers > 20) {
      console.log(`\n--- Database contains ${totalUsers} users (showing first 20) ---`);
      const allResult = await client.query('SELECT * FROM users ORDER BY id LIMIT 20');
      allResult.rows.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log(JSON.stringify(user, null, 2));
      });
    }

  } catch (error) {
    console.error('Error connecting to database:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✓ Database connection closed');
  }
}

queryUsers();
