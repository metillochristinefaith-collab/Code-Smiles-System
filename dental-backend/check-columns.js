const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

client.connect().then(async () => {
  console.log('=== CHECKING TABLE COLUMNS ===\n');
  
  const tables = ['appointments', 'composite_bookings', 'composite_booking_appointments'];
  
  for (const table of tables) {
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [table]);
    
    console.log(`\n${table.toUpperCase()}:`);
    result.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
  }
  
  await client.end();
}).catch(err => console.error('Error:', err.message));
