const pg = require('pg');

const client = new pg.Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Dububear101523',
  database: 'code_smiles_db'
});

client.connect()
  .then(async () => {
    // Get all tables
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const schema = {};
    
    for (const tableRow of tablesRes.rows) {
      const tableName = tableRow.table_name;
      
      // Get columns for this table
      const columnsRes = await client.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      // Get constraints for this table
      const constraintsRes = await client.query(`
        SELECT 
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        LEFT JOIN information_schema.key_column_usage AS kcu
          ON tc.table_name = kcu.table_name AND tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = $1
      `, [tableName]);
      
      schema[tableName] = {
        columns: columnsRes.rows.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          default: col.column_default
        })),
        constraints: constraintsRes.rows.filter(c => c.constraint_type)
      };
    }
    
    console.log(JSON.stringify(schema, null, 2));
    client.end();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
