const { getUserStore, ADMIN_USERNAME, verifyPassword, generateToken, bcrypt } = require('./auth-utils.cjs');
const jwt = require('jsonwebtoken');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }
    
    const body = event.body ? JSON.parse(event.body) : {};
    const { username, password, adminToken } = body;
    
    if (!username || !password) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Username and password are required' }) };
    }
    
    // Admin token is required to create a user
    if (!adminToken) {
        return { statusCode: 401, body: JSON.stringify({ message: 'Admin authorization required' }) };
    }
    
    try {
        // Verify admin token
        const decoded = jwt.verify(adminToken, process.env.JWT_SECRET || 'default-secret-key');
        if (!decoded.isAdmin) {
            return { statusCode: 403, body: JSON.stringify({ message: 'Admin privileges required' }) };
        }
        
        const userStore = getUserStore();
        
        // Check if user already exists
        try {
            const existingUser = await userStore.get(username, { type: 'text' });
            if (existingUser) {
                return { statusCode: 409, body: JSON.stringify({ message: 'Username already exists' }) };
            }
        } catch (error) {
            // If get throws 404, user doesn't exist, which is good.
            if (error.status !== 404) {
                console.error('Error checking user existence:', error);
                return { statusCode: 500, body: JSON.stringify({ message: 'Error checking user existence' }) };
            }
        }
        
        // Hash the password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        // Store user
        await userStore.set(username, passwordHash, { type: 'text' });
        
        return { 
            statusCode: 201, 
            body: JSON.stringify({ 
                message: 'User created successfully',
                username
            })
        };
    } catch (error) {
        console.error('Error creating user:', error);
        if (error.name === 'JsonWebTokenError') {
            return { statusCode: 401, body: JSON.stringify({ message: 'Invalid admin token' }) };
        }
        return { statusCode: 500, body: JSON.stringify({ message: 'Error creating user' }) };
    }
};
