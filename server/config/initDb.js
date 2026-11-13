const { Client, Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function initDatabase() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:IT@localhost:5432/slate_workspace';
  
  // Extract base connection to 'postgres' database to check/create 'slate_workspace'
  const url = new URL(dbUrl);
  const targetDb = url.pathname.replace(/^\//, '') || 'slate_workspace';
  
  // URL to connect to the default 'postgres' database
  const adminUrl = new URL(dbUrl);
  adminUrl.pathname = '/postgres';

  console.log(`Connecting to PostgreSQL to check database "${targetDb}"...`);
  const adminClient = new Client({ connectionString: adminUrl.toString() });

  try {
    await adminClient.connect();
    const checkRes = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDb]
    );

    if (checkRes.rowCount === 0) {
      console.log(`Database "${targetDb}" does not exist. Creating...`);
      // CREATE DATABASE cannot run in a transaction block, raw query
      await adminClient.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`Database "${targetDb}" created successfully.`);
    } else {
      console.log(`Database "${targetDb}" already exists.`);
    }
  } catch (err) {
    console.error('Error checking/creating database:', err.message);
    throw err;
  } finally {
    await adminClient.end();
  }

  // Now connect to targetDb and run schema.sql
  console.log(`Connecting to "${targetDb}" to verify/create tables...`);
  const pool = new Pool({ connectionString: dbUrl });

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
    console.log('Database tables successfully verified / created: users, tasks, projects, support_tickets.');

    // Query tables list to verify
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Existing tables in public schema:', tablesRes.rows.map(r => r.table_name));
  } catch (err) {
    console.error('Error applying schema:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Database initialization completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database initialization failed:', err);
      process.exit(1);
    });
}

module.exports = initDatabase;

