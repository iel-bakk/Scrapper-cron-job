// neon.js
// Neon PostgreSQL database initialization and storage functions

const { Pool } = require('pg');

let pool = null;

/**
 * Initialize Neon PostgreSQL connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
function initializeNeon() {
  try {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    pool = new Pool({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false }, // Required for Neon
    });
    
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
    
    console.log('Neon PostgreSQL connection pool initialized');
    return pool;
  } catch (error) {
    console.error('Failed to initialize Neon connection:', error.message);
    throw error;
  }
}

/**
 * Create tables if they don't exist
 * @returns {Promise<void>}
 */
async function createTablesIfNotExist() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS kamas_prices (
        id SERIAL PRIMARY KEY,
        category VARCHAR(255) NOT NULL,
        server VARCHAR(255) NOT NULL,
        mad_per_million DECIMAL(10, 3) NOT NULL,
        mad_display VARCHAR(255),
        paypal VARCHAR(255),
        bitcoin VARCHAR(255),
        usdt VARCHAR(255),
        alipay VARCHAR(255),
        status VARCHAR(100),
        scraped_at TIMESTAMP NOT NULL,
        stored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_server_created 
      ON kamas_prices(server, created_at DESC);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_category_created 
      ON kamas_prices(category, created_at DESC);
    `);
    
    console.log('Database tables ready');
  } catch (error) {
    console.error('Error creating tables:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Store scraped kamas data to Neon PostgreSQL
 * @param {Array} data - Array of scraped kamas data
 * @returns {Promise<void>}
 */
async function storeKamasData(data) {
  const client = await pool.connect();
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Insert each record
    for (const item of data) {
      await client.query(
        `INSERT INTO kamas_prices 
        (category, server, mad_per_million, mad_display, paypal, bitcoin, usdt, alipay, status, scraped_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          item.category,
          item.server,
          item.mad_per_million,
          item.mad_display,
          item.paypal,
          item.bitcoin,
          item.usdt,
          item.alipay,
          item.status,
          new Date(item.scraped_at),
        ]
      );
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log(`Successfully stored ${data.length} records to Neon PostgreSQL`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error storing data to Neon:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the connection pool
 * @returns {Promise<void>}
 */
async function closeConnection() {
  if (pool) {
    await pool.end();
    console.log('Neon connection pool closed');
  }
}

module.exports = {
  initializeNeon,
  createTablesIfNotExist,
  storeKamasData,
  closeConnection,
};
