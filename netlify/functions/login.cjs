const { getUserStore, JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD_HASH, verifyPassword, generateToken } = require('./auth-utils.cjs');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const { username, password } = body;

    if (!username || !password) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Username and password are required' }) };
    }

    // Check Admin Login first
    if (ADMIN_PASSWORD_HASH && username === ADMIN_USERNAME) {
        if (await verifyPassword(password, ADMIN_PASSWORD_HASH)) {
            const token = generateToken(username, true);
            return { statusCode: 200, body: JSON.stringify({ token, message: 'Admin login successful' }) };
        }
        // Don't proceed to check regular users if admin login fails with correct username
        return { statusCode: 401, body: JSON.stringify({ message: 'Invalid admin credentials' }) };
    }

    // Check Regular User Login
    const userStore = getUserStore();
    try {
        const userHash = await userStore.get(username, { type: 'text' });
        if (userHash && await verifyPassword(password, userHash)) {
            const token = generateToken(username, false);
            return { statusCode: 200, body: JSON.stringify({ token, message: 'Login successful' }) };
        }
    } catch (error) {
        // User not found (404) is expected, other errors should be logged
        if (error.status !== 404) {
             console.error('Error fetching user during login:', error);
             // Return a generic error to avoid leaking info
             return { statusCode: 500, body: JSON.stringify({ message: 'Internal server error during login' }) };
        }
        // If user not found (404), fall through to invalid credentials
    }

    // If neither admin nor regular user login succeeded
    return { statusCode: 401, body: JSON.stringify({ message: 'Invalid credentials' }) };
};
