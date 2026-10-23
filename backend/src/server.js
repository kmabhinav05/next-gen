const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = require('./app');
const { pool } = require('./config/db');

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    // Verify database connection before starting the listener
    console.log('[Server Startup] Testing database connectivity...');
    const client = await pool.connect();
    const result = await client.query('SELECT current_database(), current_user, version()');
    console.log(`[Database Connected] Database: "${result.rows[0].current_database}" | User: "${result.rows[0].current_user}"`);
    client.release();

    app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`  Next Gen Grading Server is LIVE`);
      console.log(`  URL: http://localhost:${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('====================================================');
    });
  } catch (err) {
    console.error('[Server Startup Fatal Error] Failed to connect to PostgreSQL:');
    console.error(err.message);
    console.error('\nPlease verify DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD in your .env file.');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Server Shutdown] Gracefully closing database pool...');
  await pool.end();
  console.log('[Server Shutdown] Completed.');
  process.exit(0);
});

startServer();
