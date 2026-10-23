const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Ensure environment variables are loaded
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'next_gen_grading',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]: Unexpected error on idle client', err.message);
});

/**
 * Execute parameterized query
 * @param {string} text - SQL Query
 * @param {Array} params - Parameters array
 */
const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    // console.debug(`[DB Query] Duration: ${duration}ms | Rows: ${res.rowCount}`);
  }
  return res;
};

/**
 * Acquire a transaction client from the pool
 */
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Set timeout to avoid hung transactions
  const timeout = setTimeout(() => {
    console.error('[DB Client] Client has been checked out for more than 10 seconds!');
  }, 10000);

  client.release = () => {
    clearTimeout(timeout);
    return release();
  };

  return client;
};

module.exports = {
  pool,
  query,
  getClient,
};
