/**
 * Fix Dentist Role Issue
 * 
 * Problem: Users were given role='Dentist' in the database, but the system
 * only recognizes 'Patient', 'Staff', and 'Admin' roles.
 * 
 * Solution: Convert any 'Dentist' roles to 'Admin' (the correct role for dentists)
 */

require('dotenv').config();
const db = require('./db');

async function fixDentistRoles() {
  try {
    console.log('🔍 Checking for invalid "Dentist" roles...\n');

    // Find all users with 'Dentist' role
    const result = await db.query(
      `SELECT id, email, first_name, last_name, role FROM users WHERE role = 'Dentist'`
    );

    if (result.rowCount === 0) {
      console.log('✅ No invalid "Dentist" roles found. System is clean!');
      process.exit(0);
    }

    console.log(`⚠️  Found ${result.rowCount} user(s) with invalid "Dentist" role:\n`);
    result.rows.forEach(user => {
      console.log(`   • ${user.first_name} ${user.last_name} (${user.email})`);
    });

    console.log('\n🔄 Converting "Dentist" → "Admin"...\n');

    // Update all 'Dentist' roles to 'Admin'
    const updateResult = await db.query(
      `UPDATE users SET role = 'Admin' WHERE role = 'Dentist' RETURNING id, email, role`
    );

    console.log(`✅ Successfully updated ${updateResult.rowCount} user(s):\n`);
    updateResult.rows.forEach(user => {
      console.log(`   • ${user.email} → role: ${user.role}`);
    });

    console.log('\n✨ Fix complete! Users can now log in as Dentist.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixDentistRoles();
