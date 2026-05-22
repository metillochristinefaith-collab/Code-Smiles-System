require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcryptjs');

async function recreateMetilloDentist() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // First, check if the account already exists
    const existingCheck = await client.query(
      `SELECT id, email, role FROM users WHERE email = $1`,
      ['metillo@codesmiles.com']
    );
    
    if (existingCheck.rows.length > 0) {
      console.log('⚠️  Account with email metillo@codesmiles.com already exists:');
      console.log(JSON.stringify(existingCheck.rows[0], null, 2));
      console.log('\nUpdating to ensure it has correct role and password...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash('Dentist@1234', 10);
      
      // Update the existing account
      await client.query(
        `UPDATE users 
         SET role = 'Admin', 
             password = $1, 
             status = 'Active', 
             is_verified = TRUE,
             first_name = 'Christine',
             last_name = 'Metillo'
         WHERE email = $2`,
        [hashedPassword, 'metillo@codesmiles.com']
      );
      
      await client.query('COMMIT');
      
      console.log('\n✅ Dr. Metillo\'s account has been restored!');
    } else {
      console.log('Creating new Dr. Metillo dentist account...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash('Dentist@1234', 10);
      
      // Create the account
      const result = await client.query(
        `INSERT INTO users (first_name, last_name, email, phone, password, role, status, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
         RETURNING id, first_name, last_name, email, role, status`,
        [
          'Christine',
          'Metillo',
          'metillo@codesmiles.com',
          '09476587456',
          hashedPassword,
          'Admin',
          'Active'
        ]
      );
      
      await client.query('COMMIT');
      
      console.log('\n✅ Dr. Metillo\'s account has been created!');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }
    
    console.log('\n📋 Account Details:');
    console.log('  Email: metillo@codesmiles.com');
    console.log('  Password: Dentist@1234');
    console.log('  Role: Admin (Dentist)');
    console.log('  Status: Active');
    console.log('\n✅ Dr. Metillo can now log in to the Dentist Portal!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

recreateMetilloDentist();
