require('dotenv').config();
const db = require('./db');

(async () => {
  try {
    const result = await db.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'appointments' ORDER BY ordinal_position`
    );
    console.log('Appointments table columns:');
    result.rows.forEach(col => {
      console.log(`  • ${col.column_name} (${col.data_type})`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(0);
  }
})();
