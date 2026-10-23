const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

const targetDbName = process.env.DB_NAME || 'next_gen_grading';

async function initializeDatabase() {
  console.log('====================================================');
  console.log('  Next Gen Grading - Database Initializer & Migration');
  console.log('====================================================');

  // Step 1: Connect to maintenance database 'postgres' to verify/create target database
  const rootClient = new Client({
    ...dbConfig,
    database: 'postgres',
  });

  try {
    await rootClient.connect();
    console.log(`[1/4] Connected to PostgreSQL host (${dbConfig.host}:${dbConfig.port})`);

    const checkDb = await rootClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDbName]
    );

    if (checkDb.rowCount === 0) {
      console.log(`[2/4] Database "${targetDbName}" not found. Creating database...`);
      await rootClient.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`[2/4] Database "${targetDbName}" created successfully.`);
    } else {
      console.log(`[2/4] Target database "${targetDbName}" exists.`);
    }
  } catch (err) {
    console.error('[Error connecting to root postgres db]:', err.message);
    throw err;
  } finally {
    await rootClient.end();
  }

  // Step 2: Connect to target database and run schema.sql
  const appClient = new Client({
    ...dbConfig,
    database: targetDbName,
  });

  try {
    await appClient.connect();
    console.log(`[3/4] Connected to target database "${targetDbName}". Executing schema.sql...`);

    const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at ${schemaPath}`);
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await appClient.query(schemaSql);
    console.log('[3/4] Schema executed: 21 tables, constraints, indexes & triggers successfully created.');

    // Step 3: Run seed.sql
    console.log('[4/4] Populating test & demonstration seed data from seed.sql...');
    const seedPath = path.resolve(__dirname, '../../../database/seed.sql');
    if (!fs.existsSync(seedPath)) {
      throw new Error(`seed.sql not found at ${seedPath}`);
    }
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await appClient.query(seedSql);
    console.log('[4/4] Seed data populated successfully!');

    // Verify accounts
    const usersCount = await appClient.query('SELECT role, count(*) FROM users GROUP BY role');
    console.log('\n--- VERIFIED SEED ACCOUNTS ---');
    console.table(usersCount.rows);

    console.log('\nReady-to-use Demo Credentials:');
    console.log('  Admin:   admin    / Admin@123');
    console.log('  Staff:   staff1   / Staff@123  (Dr. Sarah Jenkins - HOD)');
    console.log('  Staff:   staff2   / Staff@123  (Prof. Alan Turing)');
    console.log('  Student: student1 / Student@123 (Alex Turner - CSE-A)');
    console.log('  Student: student2 / Student@123 (Bella Chen - CSE-A)');
    console.log('  Parent:  parent1  / Parent@123 (Robert Turner - Father of Alex Turner)');
    console.log('====================================================\n');
  } catch (err) {
    console.error('[Database Migration / Seed Error]:', err);
    throw err;
  } finally {
    await appClient.end();
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Initialization failed:', err.message);
      process.exit(1);
    });
}

module.exports = initializeDatabase;
