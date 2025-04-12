const { getStore } = require('@netlify/blobs');
const { formatISO } = require('date-fns');

/**
 * Get credentials for Netlify Blob store
 */
function getCredentials() {
  return {
    siteID: process.env.SITE_ID || process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_API_TOKEN || process.env.NETLIFY_AUTH_TOKEN
  };
}

// Helper function to get notes store for a user
const getNotesStore = (username) => getStore({
  name: `notes-${username}`,
  ...getCredentials()
});

// Helper function to get categories store for a user
const getCategoriesStore = (username) => getStore({
  name: `categories-${username}`,
  ...getCredentials()
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

// Function to update the categories store
const updateCategories = async (username, newCategories) => {
  if (!Array.isArray(newCategories) || newCategories.length === 0) {
    return; // No categories to add
  }
  const categoriesStore = getCategoriesStore(username);
  try {
    const existingCategories = await getExistingCategories(username);
    const categoriesSet = new Set(existingCategories);
    newCategories.forEach(cat => categoriesSet.add(cat));
    const updatedCategories = Array.from(categoriesSet);
    // Sort categories alphabetically for consistency
    updatedCategories.sort(); 
    await categoriesStore.setJSON(CATEGORIES_KEY, updatedCategories);
    console.log(`Updated categories for user ${username}:`, updatedCategories);
  } catch (error) {
    console.error('Error updating categories:', error);
    // Decide how to handle this - maybe log and continue?
  }
};

module.exports = {
  getNotesStore,
  getCategoriesStore,
  getExistingCategories,
  updateCategories,
  DEFAULT_CATEGORIES,
  CATEGORIES_KEY
};
