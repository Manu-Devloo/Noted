const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./auth-utils.cjs');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const { token } = body;
    
    if (!token) {
        return { statusCode: 400, body: JSON.stringify({ 
            valid: false,
            message: 'No token provided' 
        })};
    }
    
    try {
        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        return { statusCode: 200, body: JSON.stringify({ 
            valid: true,
            message: 'Token is valid',
            user: decoded
        })};
    } catch (error) {
        console.error('Error verifying token:', error);
        
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return { statusCode: 401, body: JSON.stringify({ 
                valid: false,
                message: 'Invalid or expired token' 
            })};
        }
        
        return { statusCode: 500, body: JSON.stringify({ 
            valid: false,
            message: 'Error verifying token',
            error: error.message 
        })};
    }
};
