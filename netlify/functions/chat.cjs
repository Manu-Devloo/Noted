const { getNotesStore } = require('./auth-utils.cjs');
const jwt = require('jsonwebtoken');
const OpenAI = require('openai');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: OPENAI_BASE_URL,
});

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

// Helper to fetch all notes for a user
async function fetchAllNotes(username) {
  const notesStore = getNotesStore(username);
  const list = await notesStore.list();
  const notes = [];for (const item of list.blobs) {try {
      const note = await notesStore.get(item.key, { type: 'json' });
      if (note) notes.push(note);
    } catch (e) { /* skip errors */ }
  }
  return notes;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }
  if (!OPENAI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ message: 'OpenAI API key not configured' }) };
  }
  const authResult = verifyToken(event);
  if (authResult.error) return authResult.error;
  const { username } = authResult.user;
  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 400, body: JSON.stringify({ message: 'Invalid JSON' }) };
  }
  const { message, history } = body;
  if (!message) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Message is required' }) };
  }
  try {
    // Always fetch notes for context
    const notes = await fetchAllNotes(username);
    const today = new Date().toISOString().split('T')[0];
    const notesText = notes.map(n => `Title: ${n.title || 'Untitled'}\nContent: ${n.content}\nSummary: ${n.summary || ''}\nCategories: ${(n.categories||[]).join(', ')}\nCreated: ${n.createdAt || 'unknown'}\nUpdated: ${n.updatedAt || 'unknown'}\n---`).join('\n');
    const systemPrompt = `You are an assistant with access to the user's notes. Today is ${today}.\nHere are all the user's notes:\n${notesText}\n\nInstructions: Answer as helpfully as possible, using the notes as context. If the user asks about something not in the notes, say so.`;
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(history) ? history : []),
      { role: 'user', content: message }
    ];
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 500,
      temperature: 0.7
    });
    const reply = completion.choices[0].message.content;
    return {
      statusCode: 200,
      body: JSON.stringify({ reply }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  } catch (error) {
    console.error('Chat error:', error);
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to process chat.' }) };
  }
};
