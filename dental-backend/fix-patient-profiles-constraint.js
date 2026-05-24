const db = require('./db');

async function fixConstraint() {
  try {
    console.log('Checking patient_profiles table constraints...');
    
    // Check existing constraints
    const constraints = await db.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'patient_profiles'
    `);
    
    console.log('Current constraints:');
    console.log(constraints.rows);
    
    // Check if unique constraint on user_id exists
    const uniqueConstraint = constraints.rows.find(c => 
      c.constraint_type === 'UNIQUE' && c.constraint_name.includes('user_id')
    );
    
    if (!uniqueConstraint) {
      console.log('\n❌ No unique constraint on user_id found. Adding it...');
      
      // Add unique constraint
      await db.query(`
        ALTER TABLE patient_profiles 
        ADD CONSTRAINT patient_profiles_user_id_unique UNIQUE (user_id)
      `);
      
      console.log('✅ Unique constraint added!');
    } else {
      console.log('\n✅ Unique constraint already exists:', uniqueConstraint.constraint_name);
    }
    
    // Verify
    const verify = await db.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'patient_profiles'
    `);
    
    console.log('\nFinal constraints:');
    console.log(verify.rows);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixConstraint();
