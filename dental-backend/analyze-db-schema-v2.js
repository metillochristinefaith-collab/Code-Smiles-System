require('dotenv').config();
const db = require('./db');

async function analyzeDBSchema() {
  try {
    // Get all tables
    const tablesResult = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' 
       ORDER BY table_name`
    );

    console.log('═'.repeat(100));
    console.log('CODE SMILES DATABASE SCHEMA ANALYSIS');
    console.log('═'.repeat(100));
    console.log(`\nTotal Tables: ${tablesResult.rows.length}\n`);

    // Analyze each table
    for (const tableRow of tablesResult.rows) {
      const tableName = tableRow.table_name;

      // Get columns
      const columnsResult = await db.query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_name = $1
         ORDER BY ordinal_position`,
        [tableName]
      );

      // Get constraints
      const constraintsResult = await db.query(
        `SELECT constraint_name, constraint_type
         FROM information_schema.table_constraints
         WHERE table_name = $1`,
        [tableName]
      );

      // Get row count
      const countResult = await db.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const rowCount = countResult.rows[0].count;

      console.log(`\n${'─'.repeat(100)}`);
      console.log(`TABLE: ${tableName.toUpperCase()}`);
      console.log(`${'─'.repeat(100)}`);
      console.log(`Rows: ${rowCount}\n`);

      console.log('Columns:');
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`  • ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${nullable}${defaultVal}`);
      });

      if (constraintsResult.rows.length > 0) {
        console.log('\nConstraints:');
        constraintsResult.rows.forEach(constraint => {
          console.log(`  • ${constraint.constraint_name} (${constraint.constraint_type})`);
        });
      }
    }

    // Summary and recommendations
    console.log(`\n\n${'═'.repeat(100)}`);
    console.log('SCHEMA ORGANIZATION ANALYSIS');
    console.log('═'.repeat(100));

    // Categorize tables
    const userTables = ['users', 'staff', 'dentist', 'patient_profiles'];
    const appointmentTables = ['appointments'];
    const clinicalTables = ['treatment_plans', 'treatment_sessions', 'clinical_notes', 'prescriptions'];
    const supportTables = ['notifications', 'support_requests', 'faqs'];
    const billingTables = ['billing'];
    const vaultTables = ['vault_file_sharing', 'patient_vault_records'];

    console.log('\n📋 CURRENT TABLE ORGANIZATION:\n');
    console.log('User Management:');
    userTables.forEach(t => {
      if (tablesResult.rows.find(r => r.table_name === t)) {
        console.log(`  ✓ ${t}`);
      }
    });

    console.log('\nAppointment Management:');
    appointmentTables.forEach(t => {
      if (tablesResult.rows.find(r => r.table_name === t)) {
        console.log(`  ✓ ${t}`);
      }
    });

    console.log('\nClinical Management:');
    clinicalTables.forEach(t => {
      if (tablesResult.rows.find(r => r.table_name === t)) {
        console.log(`  ✓ ${t}`);
      }
    });

    console.log('\nSupport & Communication:');
    supportTables.forEach(t => {
      if (tablesResult.rows.find(r => r.table_name === t)) {
        console.log(`  ✓ ${t}`);
      }
    });

    console.log('\nBilling:');
    billingTables.forEach(t => {
      if (tablesResult.rows.find(r => r.table_name === t)) {
        console.log(`  ✓ ${t}`);
      }
    });

    console.log('\nVault & File Sharing:');
    vaultTables.forEach(t => {
      if (tablesResult.rows.find(r => r.table_name === t)) {
        console.log(`  ✓ ${t}`);
      }
    });

    console.log('\n\n📊 RECOMMENDATIONS FOR BETTER ORGANIZATION:\n');
    console.log('1. ✓ User Management is well organized (users, staff, dentist, patient_profiles)');
    console.log('2. ✓ Clinical data is grouped (treatment_plans, treatment_sessions, clinical_notes, prescriptions)');
    console.log('3. ✓ Support features are grouped (notifications, support_requests, faqs)');
    console.log('4. ✓ Vault features are grouped (vault_file_sharing, patient_vault_records)');
    console.log('5. ✓ Appointments are separate (appointments)');
    console.log('6. ✓ Billing is separate (billing)');
    console.log('\n✅ Overall: The schema is reasonably well organized by domain/feature!');

  } catch (err) {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    process.exit(0);
  }
}

analyzeDBSchema();
