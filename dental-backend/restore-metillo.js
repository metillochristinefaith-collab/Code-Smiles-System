require('dotenv').config();
const db = require('./db');

async function restoreMetillo() {
  try {
    // Get current user info
    const userResult = await db.query(
      `SELECT id, first_name, last_name, email, role, status FROM users WHERE id = 24`
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      process.exit(0);
    }
    
    const user = userResult.rows[0];
    console.log('Current user info:');
    console.log(JSON.stringify(user, null, 2));
    
    // If the role is not "Dentist", update it
    if (user.role !== 'Dentist') {
      console.log('\n⚠️  Role is not "Dentist", updating...');
      await db.query(
        `UPDATE users SET role = 'Dentist' WHERE id = 24`
      );
      console.log('✓ Role updated to "Dentist"');
    }
    
    // If status is not "Active", update it
    if (user.status !== 'Active') {
      console.log('⚠️  Status is not "Active", updating...');
      await db.query(
        `UPDATE users SET status = 'Active' WHERE id = 24`
      );
      console.log('✓ Status updated to "Active"');
    }
    
    // Get updated info
    const updatedResult = await db.query(
      `SELECT id, first_name, last_name, email, role, status FROM users WHERE id = 24`
    );
    
    console.log('\n✅ Updated user info:');
    console.log(JSON.stringify(updatedResult.rows[0], null, 2));
    console.log('\n✅ Dr. Metillo has been restored!');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

restoreMetillo();
