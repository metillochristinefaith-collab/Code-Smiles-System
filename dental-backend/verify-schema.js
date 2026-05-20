const db = require('./db');

async function verifySchema() {
  try {
    const result = await db.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'appointments' 
       ORDER BY ordinal_position`
    );

    console.log('✓ Appointments table columns:');
    result.rows.forEach(r => {
      console.log(`  - ${r.column_name} (${r.data_type})`);
    });

    // Check for required columns
    const requiredColumns = [
      'id', 'patient_id', 'patient_name', 'phone', 'email',
      'treatment', 'dentist_id', 'dentist_name',
      'appointment_date', 'appointment_time', 'duration_minutes',
      'status'
    ];

    const columnNames = result.rows.map(r => r.column_name);
    const missing = requiredColumns.filter(col => !columnNames.includes(col));

    if (missing.length === 0) {
      console.log('\n✓ All required columns present!');
    } else {
      console.log(`\n✗ Missing columns: ${missing.join(', ')}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifySchema();
