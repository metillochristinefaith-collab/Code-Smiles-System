/**
 * seed-dentists.js
 * Fixes all 4 dentist accounts — adds missing ones, adds specialty column.
 * Run: node seed-dentists.js
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function run() {
  const db = new Client({
    host: 'localhost', port: 5432,
    user: 'postgres', password: 'Dububear101523',
    database: 'code_smiles_db',
  });

  await db.connect();

  // Add specialty column if it doesn't exist
  await db.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty TEXT;
  `);
  console.log('specialty column ready.');

  const dentists = [
    {
      first_name: 'Raphoncel',
      last_name:  'Eduria',
      email:      'eduria@codesmiles.com',
      phone:      '09000000003',
      password:   'Dentist@1234',
      specialty:  'General Dentistry, Oral Surgery',
    },
    {
      first_name: 'Christine Faith',
      last_name:  'Metillo',
      email:      'metillo@codesmiles.com',
      phone:      '09000000005',
      password:   'Dentist@1234',
      specialty:  'Orthodontics, Dental Implants',
    },
    {
      first_name: 'Nico',
      last_name:  'Bongolto',
      email:      'bongolto@codesmiles.com',
      phone:      '09000000004',
      password:   'Dentist@1234',
      specialty:  'Pediatric Care',
    },
    {
      first_name: 'Derence',
      last_name:  'Acojedo',
      email:      'acojedo@codesmiles.com',
      phone:      '09000000002',
      password:   'Dentist@1234',
      specialty:  'Cosmetic Arts',
    },
  ];

  for (const d of dentists) {
    const exists = await db.query('SELECT id FROM users WHERE email = $1', [d.email]);

    if (exists.rowCount === 0) {
      const hash = await bcrypt.hash(d.password, 10);
      await db.query(
        `INSERT INTO users (first_name, last_name, email, phone, password, role, specialty, is_verified)
         VALUES ($1,$2,$3,$4,$5,'Admin',$6, TRUE)`,
        [d.first_name, d.last_name, d.email, d.phone, hash, d.specialty]
      );
      console.log(`Added: Dr. ${d.first_name} ${d.last_name} (${d.specialty})`);
    } else {
      // Update specialty for existing accounts
      await db.query(
        `UPDATE users SET specialty = $1, first_name = $2, last_name = $3, role = 'Admin', is_verified = TRUE WHERE email = $4`,
        [d.specialty, d.first_name, d.last_name, d.email]
      );
      console.log(`Updated: Dr. ${d.first_name} ${d.last_name} (${d.specialty})`);
    }
  }

  console.log('\nAll 4 dentist accounts ready:');
  console.log('  Dr. Raphoncel Eduria       eduria@codesmiles.com    / Dentist@1234  → General Dentistry, Oral Surgery');
  console.log('  Dr. Christine Faith Metillo metillo@codesmiles.com  / Dentist@1234  → Orthodontics, Dental Implants');
  console.log('  Dr. Nico Bongolto          bongolto@codesmiles.com  / Dentist@1234  → Pediatric Care');
  console.log('  Dr. Derence Acojedo        acojedo@codesmiles.com   / Dentist@1234  → Cosmetic Arts');

  await db.end();
}

run().catch(console.error);
