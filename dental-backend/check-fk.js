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
  console.log('=== CHECKING FOREIGN KEYS ===\n');
  
  const result = await client.query(`
    SELECT 
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('appointments', 'composite_bookings', 'composite_booking_appointments', 'service_dentist_mapping')
    ORDER BY tc.table_name, kcu.column_name
  `);
  
  console.log('FOREIGN KEYS:\n');
  result.rows.forEach(row => {
    console.log(`${row.table_name}.${row.column_name} -> ${row.foreign_table_name}(${row.foreign_column_name})`);
  });
  
  await client.end();
}).catch(err => console.error('Error:', err.message));
