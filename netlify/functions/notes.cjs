const { getStore } = require('@netlify/blobs');
const OpenAI = require('openai');
const jwt = require('jsonwebtoken');
const { formatISO } = require('date-fns');

// JWT and OpenAI configuration
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL; // Optional: For custom API endpoints

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    baseURL: OPENAI_BASE_URL, // Will be undefined if not set, using the default
});

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


// OpenAI Prompt - Now explicitly instructs to preserve line breaks
const createOpenAIPrompt = (noteContent, existingCategories) => `
You are an assistant that processes handwritten or typed notes and converts them into structured JSON.

Your job is to:

Extract the content of the note (If you get an image you will get the needed info from the image to the best of your ability, most of the times the text in the image will be in dutch).
Summarize the key points in 1–2 sentences.
Classify the note into 1 or more relevant categories from the provided list.
Only use categories from this list: ${JSON.stringify(existingCategories)}
If none of these categories seem appropriate, you can use the category "Miscellaneous". Or invent a new one if really needed.

Return everything in the following JSON format:
{
"title": "Concise title for the note",
"content": "Full extracted content here... (PRESERVE ALL ORIGINAL LINE BREAKS AND FORMATTING)",
"summary": "Short summary here...",
"categories": ["Category1", "Category2"]
}

Always return this exact JSON format, DO NOT USE MARKDOWN.

Note Content:
${noteContent}
`;

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
    // Fix path handling to properly parse both direct and nested paths
    let path = event.path;
    // First check if this is a direct call to the function with a path
    if (path.startsWith('/.netlify/functions/notes/')) {
        path = '/' + path.split('/.netlify/functions/notes/')[1];
    } else {
        // Fall back to the old method for direct function calls with query params
        path = path.replace('/.netlify/functions/notes', '');
    }
    const method = event.httpMethod;

    if (!OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY environment variable is not set.');
        return { statusCode: 500, body: JSON.stringify({ message: 'Server configuration error: OpenAI API key missing.' }) };
    }

    // Verify token for all note operations
    const authResult = verifyToken(event);
    if (authResult.error) {
        return authResult.error;
    }
    const { username } = authResult.user;
    const notesStore = getNotesStore(username);
    // No need to get categoriesStore here unless specifically needed outside functions    // Create Note
    if (path === '' && method === 'POST') {
        let noteInput;
        let isBase64 = false;
        let isMultipart = false;
        let partIndex = 0;
        let totalParts = 1;
        let noteId = null;
        let contentType = event.headers['content-type'] || '';        // Check if it's multipart/form-data (likely image upload) or JSON (text)
        if (contentType.startsWith('application/json')) {
            try {
                const body = JSON.parse(event.body);

                // Check if this is part of a chunked upload
                if (body.isMultipart) {
                    isMultipart = true;
                    partIndex = body.partIndex || 0;
                    totalParts = body.totalParts || 1;
                    noteId = body.noteId || null;
                }

                if (body.image) {
                    noteInput = body.image; // Assuming base64 image string
                    isBase64 = true;
                } else if (body.images && Array.isArray(body.images)) {
                    // Handle multiple images case
                    noteInput = body.images;
                    isBase64 = true;
                } else {
                    noteInput = body.text;
                }

                if (!noteInput && !isMultipart) {
                    return { statusCode: 400, body: JSON.stringify({ message: 'Note text or image is required.' }) };
                }
            } catch (e) {
                 return { statusCode: 400, body: JSON.stringify({ message: 'Invalid JSON body.' }) };
            }
        } else {
             return { statusCode: 400, body: JSON.stringify({ message: 'Unsupported content type. Use application/json' }) };
        }


        try {
            // Fetch existing categories before calling OpenAI
            const existingCategories = await getExistingCategories(username);            let completion;
            if (isBase64) {                if (Array.isArray(noteInput)) {
                    // Handle multiple images
                    // Create content array with the text prompt and all images
                    const contentArray = [
                        { type: "text", text: createOpenAIPrompt("Combine content from all images below:", existingCategories) }
                    ];
                    
                    // Add each image to the content array
                    noteInput.forEach(image => {
                        // Check if the image is already a complete data URL
                        const imageUrl = image.base64.startsWith('data:') 
                            ? image.base64 
                            : `data:image/jpeg;base64,${image.base64}`;
                            
                        contentArray.push({
                            type: "image_url",
                            image_url: {
                                "url": imageUrl,
                            },
                        });
                    });
                    
                    // Create completion request with all images
                    completion = await openai.chat.completions.create({
                        model: "gpt-4o", // Or the latest vision model
                        messages: [
                            {
                                role: "user",
                                content: contentArray,
                            },
                        ],
                        max_tokens: 4000, // Increased for multiple images
                    });
                } else {
                    // Single image case
                    // Check if the image is already a complete data URL
                    const imageUrl = noteInput.startsWith('data:') 
                        ? noteInput 
                        : `data:image/jpeg;base64,${noteInput}`;
                        
                    completion = await openai.chat.completions.create({
                        model: "gpt-4o", // Or the latest vision model
                        messages: [
                            {
                                role: "user",
                                content: [
                                    { type: "text", text: createOpenAIPrompt("Image content below:", existingCategories) }, // Pass categories
                                    {
                                        type: "image_url",
                                        image_url: {
                                            "url": imageUrl,
                                        },
                                    },
                                ],
                            },
                        ],
                        max_tokens: 4000, // Adjust as needed
                    });
                }
            } else {
                 // Use standard chat completion for text
                 completion = await openai.chat.completions.create({
                    model: "gpt-4o", // Or another suitable model
                    messages: [{ role: "user", content: createOpenAIPrompt(noteInput, existingCategories) }], // Pass categories
                    response_format: { type: "json_object" }, // Request JSON output
                });
            }


            let noteData;

            try {
                 // Extract the JSON string from the response
                 const jsonString = completion.choices[0].message.content;
                 // Attempt to parse the JSON string
                 noteData = JSON.parse(jsonString);
            } catch (parseError) {
                 console.error("Error parsing OpenAI response:", parseError);
                 console.error("Raw OpenAI response:", completion.choices[0].message.content);
                 // Try to recover if the model didn't strictly adhere to JSON format but included ```json ... ````
                 const match = completion.choices[0].message.content.match(/```json\\n([\\s\\S]*?)\\n```/);
                 if (match && match[1]) {
                    try {
                        noteData = JSON.parse(match[1]);
                        console.log("Successfully parsed JSON from code block.");
                    } catch (nestedParseError) {
                        console.error("Failed to parse JSON even from code block:", nestedParseError);
                        return { statusCode: 500, body: JSON.stringify({ message: 'Error processing note: Invalid format from AI.' }) };
                    }
                 } else {
                    return { statusCode: 500, body: JSON.stringify({ message: 'Error processing note: Invalid format from AI.' }) };
                 }
            }


            // Validate expected fields (basic check) - Removed new_category check
            if (!noteData.title || !noteData.content || !noteData.summary || !noteData.categories) {
                 console.error("Invalid JSON structure from OpenAI:", noteData);
                 return { statusCode: 500, body: JSON.stringify({ message: 'Error processing note: Missing required fields in AI response.' }) };
            }

            // Add createdAt timestamp
            const createdAt = formatISO(new Date()); // Use date-fns to format

            const noteId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const finalNoteData = { ...noteData, createdAt }; // Add timestamp here

            await notesStore.setJSON(noteId, finalNoteData);

            // Update the categories store (async, don't need to wait for response)
            updateCategories(username, noteData.categories).catch(err => {
                console.error("Background category update failed:", err); // Log error if update fails
            });

            return { statusCode: 201, body: JSON.stringify({ id: noteId, ...finalNoteData }) }; // Return final data

        } catch (error) {
            console.error('Error processing note with OpenAI or saving to Blob:', error);
             // Check for specific OpenAI errors if needed
             if (error.response) {
                 console.error('OpenAI API Error:', error.response.status, error.response.data);
             }
            return { statusCode: 500, body: JSON.stringify({ message: 'Failed to process or save note.' }) };
        }
    }

    // Get all notes for the user
     if (path === '' && method === 'GET') {
        try {
            const { blobs } = await notesStore.list();
            const notes = await Promise.all(blobs.map(async (blob) => {
                const noteData = await notesStore.get(blob.key, { type: 'json' });
                // Ensure createdAt exists, add a default if missing (for older notes)
                const createdAt = noteData?.createdAt || formatISO(new Date(0)); // Default to epoch if missing
                return { id: blob.key, ...noteData, createdAt };
            }));
             // Sort notes by creation date, newest first
             notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return { statusCode: 200, body: JSON.stringify(notes) };
        } catch (error) {
            console.error('Error fetching notes:', error);
            return { statusCode: 500, body: JSON.stringify({ message: 'Failed to fetch notes.' }) };
        }
    }

     // Get a specific note
    if (path.startsWith('/') && path.length > 1 && method === 'GET') {
        const noteId = path.substring(1); // Remove leading '/'
        try {
            const noteData = await notesStore.get(noteId, { type: 'json' });
             if (!noteData) {
                 return { statusCode: 404, body: JSON.stringify({ message: 'Note not found' }) };
             }
             // Ensure createdAt exists
             const createdAt = noteData?.createdAt || formatISO(new Date(0));
            return { statusCode: 200, body: JSON.stringify({ id: noteId, ...noteData, createdAt }) };
        } catch (error) {
             if (error.status === 404) {
                 return { statusCode: 404, body: JSON.stringify({ message: 'Note not found' }) };
             }
            console.error('Error fetching note:', error);
            return { statusCode: 500, body: JSON.stringify({ message: 'Failed to fetch note.' }) };
        }
    }

     // Delete a note
    if (path.startsWith('/') && path.length > 1 && method === 'DELETE') {
        const noteId = path.substring(1); // Remove leading '/'
        try {
            // Maybe fetch the note first to see its categories before deleting?
            // const noteToDelete = await notesStore.get(noteId, { type: 'json' });
            await notesStore.delete(noteId);
            // If noteToDelete was fetched, trigger a category cleanup check here
            return { statusCode: 200, body: JSON.stringify({ message: 'Note deleted successfully' }) };
        } catch (error) {
             console.error('Error deleting note:', error);
            return { statusCode: 500, body: JSON.stringify({ message: 'Failed to delete note.' }) };
        }    }    
    
    // Handle appending to an existing note (for chunked uploads)
    if (path === '/append' && method === 'POST') {
        try {
            const body = JSON.parse(event.body);
            
            // Validate required parameters
            if (!body.noteId || !body.images || !Array.isArray(body.images)) {
                return { statusCode: 400, body: JSON.stringify({ message: 'Missing required parameters for append operation' }) };
            }
            
            const noteId = body.noteId;
            const images = body.images;
            const partIndex = body.partIndex || 0;
            const totalParts = body.totalParts || 1;
            
            // Fetch the existing note
            let existingNote;
            try {
                existingNote = await notesStore.get(noteId, { type: 'json' });
                if (!existingNote) {
                    return { statusCode: 404, body: JSON.stringify({ message: 'Note not found' }) };
                }
            } catch (error) {
                if (error.status === 404) {
                    return { statusCode: 404, body: JSON.stringify({ message: 'Note not found' }) };
                }
                throw error;
            }
            
            // Fetch existing categories for AI processing
            const existingCategories = await getExistingCategories(username);
            
            // Process the new images with OpenAI
            const contentArray = [
                { type: "text", text: createOpenAIPrompt(`Additional content from images (part ${partIndex + 1} of ${totalParts}):`, existingCategories) }
            ];
            
            // Add each image to the content array
            images.forEach(image => {
                const imageUrl = image.base64.startsWith('data:') 
                    ? image.base64 
                    : `data:image/jpeg;base64,${image.base64}`;
                    
                contentArray.push({
                    type: "image_url",
                    image_url: {
                        "url": imageUrl,
                    },
                });
            });
            
            // Create completion request with the new images
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: contentArray,
                    },
                ],
                max_tokens: 4000,
            });
            
            // Parse the AI response
            let newContentData;
            try {
                const jsonString = completion.choices[0].message.content;
                newContentData = JSON.parse(jsonString);
            } catch (parseError) {
                console.error("Error parsing OpenAI response for append:", parseError);
                const match = completion.choices[0].message.content.match(/```json\\n([\\s\\S]*?)\\n```/);
                if (match && match[1]) {
                    try {
                        newContentData = JSON.parse(match[1]);
                    } catch (nestedParseError) {
                        return { statusCode: 500, body: JSON.stringify({ message: 'Error processing additional images: Invalid format from AI.' }) };
                    }
                } else {
                    return { statusCode: 500, body: JSON.stringify({ message: 'Error processing additional images: Invalid format from AI.' }) };
                }
            }
            
            // Merge the new content with the existing note
            const updatedNote = {
                ...existingNote,
                title: existingNote.title, // Keep the original title
                content: existingNote.content + "\n\n" + newContentData.content,
                summary: existingNote.summary + " " + newContentData.summary,
                // Combine and deduplicate categories
                categories: [...new Set([...existingNote.categories, ...newContentData.categories])],
                updatedAt: formatISO(new Date())
            };
            
            // Save the updated note
            await notesStore.setJSON(noteId, updatedNote);
            
            // Update categories if needed
            updateCategories(username, newContentData.categories).catch(err => {
                console.error("Background category update failed during append:", err);
            });
            
            return { 
                statusCode: 200, 
                body: JSON.stringify({ 
                    id: noteId, 
                    ...updatedNote,
                    message: `Successfully appended part ${partIndex + 1} of ${totalParts}`
                }) 
            };
            
        } catch (error) {
            console.error('Error appending to note:', error);
            if (error.response) {
                console.error('OpenAI API Error during append:', error.response.status, error.response.data);
            }
            return { statusCode: 500, body: JSON.stringify({ message: 'Failed to append to note.' }) };
        }
    }

    // Edit a note (PUT or PATCH)
    if (path.startsWith('/') && path.length > 1 && (method === 'PUT' || method === 'PATCH')) {
        const noteId = path.substring(1); // Remove leading '/'
        let contentType = event.headers['content-type'] || '';
        if (!contentType.startsWith('application/json')) {
            return { statusCode: 400, body: JSON.stringify({ message: 'Unsupported content type. Use application/json' }) };
        }
        try {
            const body = JSON.parse(event.body);
            const existingNote = await notesStore.get(noteId, { type: 'json' });
            if (!existingNote) {
                return { statusCode: 404, body: JSON.stringify({ message: 'Note not found' }) };
            }
            let updatedNote = { ...existingNote };
            // If editing text fields
            if (body.text) updatedNote.content = body.text;
            if (body.title) updatedNote.title = body.title;
            if (body.summary) updatedNote.summary = body.summary;
            if (body.categories) updatedNote.categories = body.categories;
            // If editing images, process with OpenAI
            if (body.images && Array.isArray(body.images) && body.images.length > 0) {
                const existingCategories = await getExistingCategories(username);
                const contextText = body.context || '';
                const contentArray = [];
                if (contextText) {
                    contentArray.push({ type: 'text', text: createOpenAIPrompt(contextText, existingCategories) });
                } else {
                    contentArray.push({ type: 'text', text: createOpenAIPrompt('Image content below:', existingCategories) });
                }
                body.images.forEach(image => {
                    const imageUrl = image.base64.startsWith('data:') ? image.base64 : `data:image/jpeg;base64,${image.base64}`;
                    contentArray.push({ type: 'image_url', image_url: { url: imageUrl } });
                });
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [{ role: 'user', content: contentArray }],
                    max_tokens: 4000,
                });
                let noteData;
                try {
                    noteData = JSON.parse(completion.choices[0].message.content);
                } catch (parseError) {
                    const match = completion.choices[0].message.content.match(/```json\\n([\\s\\S]*?)\\n```/);
                    if (match && match[1]) {
                        noteData = JSON.parse(match[1]);
                    } else {
                        return { statusCode: 500, body: JSON.stringify({ message: 'Error processing note: Invalid format from AI.' }) };
                    }
                }
                // Merge AI result into note
                updatedNote = { ...updatedNote, ...noteData };
            }
            updatedNote.updatedAt = formatISO(new Date());
            await notesStore.setJSON(noteId, updatedNote);
            return { statusCode: 200, body: JSON.stringify({ id: noteId, ...updatedNote }) };
        } catch (error) {
            console.error('Error editing note:', error);
            return { statusCode: 500, body: JSON.stringify({ message: 'Failed to edit note.' }) };
        }
    }

    return { statusCode: 404, body: JSON.stringify({ message: 'Not Found' }) };
};
