const { JWT_SECRET } = require('./auth-utils.cjs');
const { getStore } = require('@netlify/blobs');
const jwt = require('jsonwebtoken');

// Helper function to get categories store for a user
const getCategoriesStore = (username) => getStore({
  name: `categories-${username}`,
  siteID: process.env.SITE_ID || process.env.NETLIFY_SITE_ID,
  token: process.env.NETLIFY_API_TOKEN || process.env.NETLIFY_AUTH_TOKEN
});

const CATEGORIES_KEY = 'all_categories'; // Key to store the list of categories
const DEFAULT_CATEGORIES = ["Science", "Math", "History", "Literature", "Personal", "Work", "Ideas", "Tasks", "Philosophy", "Psychology", "Technology", "Miscellaneous"];

// Function to get existing categories from the dedicated store
const getExistingCategories = async (username) => {
  const categoriesStore = getCategoriesStore(username);
  try {
    const categoriesData = await categoriesStore.get(CATEGORIES_KEY, { type: 'json' });
    // Ensure it's an array, otherwise return default
    return Array.isArray(categoriesData) ? categoriesData : [...DEFAULT_CATEGORIES];
  } catch (error) {
    // If key not found (404) or other error, return default categories
    if (error.status === 404) {
      console.log(`Categories key '${CATEGORIES_KEY}' not found for user ${username}, returning default.`);
      // Optionally, initialize the store with default categories here
      // await categoriesStore.setJSON(CATEGORIES_KEY, DEFAULT_CATEGORIES);
    } else {
      console.error('Error fetching existing categories:', error);
    }
    return [...DEFAULT_CATEGORIES]; // Return a copy
  }
};

// Middleware to verify JWT
const verifyToken = (event) => {
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) } };
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { user: decoded };
  } catch (err) {
    return { error: { statusCode: 401, body: JSON.stringify({ message: 'Invalid or expired token' }) } };
  }
};

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  // Verify user authentication
  const authResult = verifyToken(event);
  if (authResult.error) {
    return authResult.error;
  }
  
  const { username } = authResult.user;
  
  try {
    // Fetch categories for the authenticated user
    const categories = await getExistingCategories(username);
    return { 
      statusCode: 200, 
      body: JSON.stringify(categories),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' // For CORS support
      }
    };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ message: 'Failed to fetch categories.' }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
};
