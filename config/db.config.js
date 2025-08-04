import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

export const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bnsw',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432
};

const db = new Pool(dbConfig);

// Wrap the query method to add logging
const originalQuery = db.query.bind(db);
db.query = async function (...args) {
  console.log('Executing query:', args[0]);
  console.log('Query parameters:', args[1]);
  try {
    const result = await originalQuery(...args);
    return result;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
};

// Log connection status
db.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

db.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export { db };