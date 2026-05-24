require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function generateERD() {
  try {
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map(r => r.table_name);
    console.log('Tables found:', tables);
    console.log('\n' + '='.repeat(80) + '\n');

    const schema = {};

    // For each table, get columns and constraints
    for (const tableName of tables) {
      // Get columns
      const columnsResult = await pool.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      // Get primary keys
      const pkResult = await pool.query(`
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid
          AND a.attnum = ANY(i.indkey)
        JOIN pg_class t ON i.indrelid = t.oid
        WHERE t.relname = $1 AND i.indisprimary = true
      `, [tableName]);

      // Get foreign keys
      const fkResult = await pool.query(`
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1
      `, [tableName]);

      // Get unique constraints
      const uniqueResult = await pool.query(`
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid
          AND a.attnum = ANY(i.indkey)
        JOIN pg_class t ON i.indrelid = t.oid
        WHERE t.relname = $1 AND i.indisunique = true AND i.indisprimary = false
      `, [tableName]);

      schema[tableName] = {
        columns: columnsResult.rows,
        primaryKeys: pkResult.rows.map(r => r.attname),
        foreignKeys: fkResult.rows,
        uniqueConstraints: uniqueResult.rows.map(r => r.attname)
      };
    }

    // Generate Mermaid ERD
    let mermaidERD = 'erDiagram\n';

    for (const [tableName, tableInfo] of Object.entries(schema)) {
      mermaidERD += `    ${tableName.toUpperCase()} {\n`;
      
      for (const col of tableInfo.columns) {
        const isPK = tableInfo.primaryKeys.includes(col.column_name);
        const isFK = tableInfo.foreignKeys.some(fk => fk.column_name === col.column_name);
        const isUnique = tableInfo.uniqueConstraints.includes(col.column_name);
        
        let marker = '';
        if (isPK) marker = 'PK';
        else if (isFK) marker = 'FK';
        else if (isUnique) marker = 'UK';
        
        const nullable = col.is_nullable === 'YES' ? '?' : '';
        mermaidERD += `        ${col.data_type} ${col.column_name}${nullable}${marker ? ' ' + marker : ''}\n`;
      }
      
      mermaidERD += '    }\n';
    }

    // Add relationships
    for (const [tableName, tableInfo] of Object.entries(schema)) {
      for (const fk of tableInfo.foreignKeys) {
        mermaidERD += `    ${tableInfo.foreignKeys[0].foreign_table_name.toUpperCase()} ||--o{ ${tableName.toUpperCase()} : "${fk.column_name}"\n`;
      }
    }

    console.log('MERMAID ERD:');
    console.log(mermaidERD);
    console.log('\n' + '='.repeat(80) + '\n');

    // Generate detailed schema documentation
    let documentation = '# Code Smiles Database Schema\n\n';

    for (const [tableName, tableInfo] of Object.entries(schema)) {
      documentation += `## ${tableName.toUpperCase()}\n\n`;
      documentation += '| Column | Type | Nullable | Constraints |\n';
      documentation += '|--------|------|----------|-------------|\n';

      for (const col of tableInfo.columns) {
        const isPK = tableInfo.primaryKeys.includes(col.column_name);
        const isFK = tableInfo.foreignKeys.some(fk => fk.column_name === col.column_name);
        const isUnique = tableInfo.uniqueConstraints.includes(col.column_name);
        
        let constraints = [];
        if (isPK) constraints.push('PRIMARY KEY');
        if (isFK) {
          const fk = tableInfo.foreignKeys.find(f => f.column_name === col.column_name);
          constraints.push(`FK → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        }
        if (isUnique) constraints.push('UNIQUE');
        
        const nullable = col.is_nullable === 'YES' ? 'Yes' : 'No';
        documentation += `| ${col.column_name} | ${col.data_type} | ${nullable} | ${constraints.join(', ') || '-'} |\n`;
      }

      documentation += '\n';
    }

    console.log('DOCUMENTATION:');
    console.log(documentation);

    // Save to files
    const fs = require('fs');
    fs.writeFileSync('erd-mermaid.md', `# Code Smiles ERD (Mermaid)\n\n\`\`\`mermaid\n${mermaidERD}\`\`\`\n`);
    fs.writeFileSync('database-schema.md', documentation);
    fs.writeFileSync('schema.json', JSON.stringify(schema, null, 2));

    console.log('\n✓ Files generated:');
    console.log('  - erd-mermaid.md');
    console.log('  - database-schema.md');
    console.log('  - schema.json');

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

generateERD();
