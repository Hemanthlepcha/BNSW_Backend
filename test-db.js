import db from './config/db.config.js';

async function testConnection() {
    try {
        // Test the connection
        const result = await db.query('SELECT NOW()');
        console.log('Database connection successful:', result.rows[0]);

        // Test the business_owner table
        const owners = await db.query('SELECT * FROM business_owner');
        console.log('Business owners in database:', owners.rows);

    } catch (error) {
        console.error('Database test failed:', error);
        console.error('Error stack:', error.stack);
    } finally {
        await db.end();
    }
}

testConnection();
