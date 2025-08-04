import { db } from '../config/db.config.js';

export const loginOwner = async (req, res) => {
    try {
        console.log('Login attempt with:', { ...req.body, license_number: '***' });
        const { username, license_number } = req.body;

        // Validate input
        if (!username || !license_number) {
            console.log('Missing required fields');
            return res.status(400).json({
                success: false,
                message: 'Username and license number are required'
            });
        }

        // Query to check business owner credentials
        const query = `
            SELECT business_license, username, name 
            FROM business_owner 
            WHERE username = $1 AND business_license = $2
        `;
        
        console.log('Executing query for username:', username);
        const result = await db.query(query, [username, license_number]);
        console.log('Query result rows:', result.rows.length);
        
        if (result.rows.length === 0) {
            console.log('No matching credentials found');
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Get owner data first
        const owner = result.rows[0];
        console.log('Found owner:', { ...owner, business_license: '***' });

        // Generate a simple token
        const token = Buffer.from(`${owner.business_license}:${Date.now()}`).toString('base64');
        
        // Return success with business owner data and token
        const response = {
            success: true,
            message: 'Login successful',
            owner: {
                ID: owner.business_license,      // For backward compatibility
                Name: owner.name,               // For backward compatibility
                business_license: owner.business_license,  // New field for dashboard
                username: owner.username,
                token: token
            }
        };
        
        console.log('Sending successful response');
        res.json(response);

    } catch (error) {
        console.error('Login error:', error);
        console.error('Error stack:', error.stack);
        
        // Check if it's a database connection error
        if (error.code === 'ECONNREFUSED') {
            return res.status(500).json({
                success: false,
                message: 'Database connection failed'
            });
        }

        // Check if it's a database query error
        if (error.code === '42P01') {
            return res.status(500).json({
                success: false,
                message: 'Database table not found - Please run database initialization'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};
