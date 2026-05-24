const pg = require('pg');

const client = new pg.Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Dububear101523',
  database: 'code_smiles_db'
});

client.connect()
  .then(() => client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
  .then(res => {
    console.log('Tables in database:');
    res.rows.forEach(row => console.log('  -', row.table_name));
    client.end();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
