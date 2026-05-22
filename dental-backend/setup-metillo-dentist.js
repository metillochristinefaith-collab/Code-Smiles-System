require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcryptjs');

async function setupMetilloDentist() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Get current user info
    const userResult = await client.query(
      `SELECT id, first_name, last_name, email, role, status FROM users WHERE id = 24`
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      await client.query('ROLLBACK');
      process.exit(0);
    }
    
    const user = userResult.rows[0];
    console.log('Current user info:');
    console.log(JSON.stringify(user, null, 2));
    
    // Update to Dentist (Admin role) and ensure verified
    console.log('\n⚙️  Setting up Dr. Metillo as a Dentist...');
    
    await client.query(
      `UPDATE users 
       SET role = 'Admin', status = 'Active', is_verified = TRUE
       WHERE id = 24`
    );
    
    console.log('✓ Role updated to "Admin" (Dentist)');
    console.log('✓ Status set to "Active"');
    console.log('✓ Email verified');
    
    // Get updated info
    const updatedResult = await client.query(
      `SELECT id, first_name, last_name, email, role, status, is_verified FROM users WHERE id = 24`
    );
    
    await client.query('COMMIT');
    
    console.log('\n✅ Updated user info:');
    console.log(JSON.stringify(updatedResult.rows[0], null, 2));
    console.log('\n✅ Dr. Metillo is now set up as a Dentist!');
    console.log('\nShe can now:');
    console.log('  • Log in with her email: metillochristinefaith@gmail.com');
    console.log('  • Access the Dentist Portal');
    console.log('  • View and manage her appointments');
    console.log('  • Create prescriptions and treatment plans');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

setupMetilloDentist();
