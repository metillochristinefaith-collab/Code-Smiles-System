require('dotenv').config();
const db = require('./db');

async function checkPatientTables() {
  try {
    console.log('═'.repeat(80));
    console.log('CHECKING PATIENT-RELATED TABLES');
    console.log('═'.repeat(80));

    // Check if patients table exists
    const tablesResult = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_name LIKE '%patient%'
       ORDER BY table_name`
    );

    console.log('\nPatient-related tables found:');
    tablesResult.rows.forEach(t => {
      console.log(`  • ${t.table_name}`);
    });

    // Check patient_profiles structure
    console.log('\n\n📋 PATIENT_PROFILES TABLE STRUCTURE:');
    console.log('─'.repeat(80));
    
    const profilesColumnsResult = await db.query(
      `SELECT column_name, data_type, is_nullable, ordinal_position
       FROM information_schema.columns
       WHERE table_name = 'patient_profiles'
       ORDER BY ordinal_position`
    );

    console.log('\nColumns:');
    profilesColumnsResult.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  ${col.ordinal_position}. ${col.column_name} (${col.data_type}) - ${nullable}`);
    });

    const profilesDataResult = await db.query('SELECT COUNT(*) as count FROM patient_profiles');
    console.log(`\nRows: ${profilesDataResult.rows[0].count}`);

    // Check if patients table exists
    const patientsTableResult = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'patients'`
    );

    if (patientsTableResult.rows.length === 0) {
      console.log('\n\n❌ PATIENTS TABLE DOES NOT EXIST');
      console.log('   (Only patient_profiles exists)');
    } else {
      console.log('\n\n📋 PATIENTS TABLE STRUCTURE:');
      console.log('─'.repeat(80));
      
      const patientsColumnsResult = await db.query(
        `SELECT column_name, data_type, is_nullable, ordinal_position
         FROM information_schema.columns
         WHERE table_name = 'patients'
         ORDER BY ordinal_position`
      );

      console.log('\nColumns:');
      patientsColumnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        console.log(`  ${col.ordinal_position}. ${col.column_name} (${col.data_type}) - ${nullable}`);
      });

      const patientsDataResult = await db.query('SELECT COUNT(*) as count FROM patients');
      console.log(`\nRows: ${patientsDataResult.rows[0].count}`);
    }

    console.log('\n' + '═'.repeat(80));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkPatientTables();
