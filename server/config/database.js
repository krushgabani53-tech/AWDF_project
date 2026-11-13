const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not defined.');
}

const pool = new Pool({
  connectionString: connectionString,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() AS current_time, current_database() AS db_name');
    console.log(`Connected to PostgreSQL database "${result.rows[0].db_name}" successfully at ${result.rows[0].current_time}`);
    return true;
  } catch (err) {
    console.error('Failed to connect to PostgreSQL:', err.message);
    return false;
  } finally {
    if (client) client.release();
  }
}

module.exports = {
  pool,
  testConnection,
};

