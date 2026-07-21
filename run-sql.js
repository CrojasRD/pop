const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_URL = 'postgresql://postgres.uvcdcmykesqvninvqvkk:PwJA2puQRvGLYpDp@aws-0-us-east-1.pooler.supabase.com:5432/postgres';

const SQL_FILES = [
  'supabase/00_schema.sql',
  'supabase/01_functions.sql',
  'supabase/02_policies.sql',
  'supabase/03_seed.sql',
  'supabase/04_operations.sql',
  'supabase/05_distribution.sql',
];

async function main() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

  try {
    console.log('Conectando a Supabase...');
    await client.connect();
    console.log('Conectado.\n');

    for (const file of SQL_FILES) {
      const filePath = path.join(__dirname, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Ejecutando ${file}...`);
      try {
        await client.query(sql);
        console.log(`  [OK] ${file}\n`);
      } catch (err) {
        console.error(`  [ERROR] ${file}: ${err.message}\n`);
        // Continuamos con el siguiente archivo aunque haya error
      }
    }

    console.log('Base de datos lista.');
  } catch (err) {
    console.error('Error de conexion:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
