import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

import Header from '../components/Header';
import AddNoteForm from '../components/AddNoteForm';
import FilterControls from '../components/FilterControls';
import NoteItem from '../components/NoteItem';
import NoteDetailModal from '../components/NoteDetailModal';
import ChatAssistant from '../components/ChatAssistant';

const API_BASE = '/.netlify/functions';

function HomePage({ token, onLogout }) {
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');  const [availableCategories, setAvailableCategories] = useState(['All']);
  const [selectedNote, setSelectedNote] = useState(null);

  // --- Data Fetching ---
  const fetchNotes = useCallback(async (currentToken) => {
    if (!currentToken) return;
    setIsLoadingNotes(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/notes`, {
        headers: { 'Authorization': `Bearer ${currentToken}` },
      });
      if (!response.ok) {
        if (response.status === 401) {
          onLogout();
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error(`Failed to fetch notes (${response.status})`);
      }
      const data = await response.json();
      setNotes(data);
    } catch (err) {
      console.error("Error fetching notes:", err);
      setError(err.message);
      setNotes([]);
    } finally {
      setIsLoadingNotes(false);
    }
  }, [onLogout]);
    const fetchCategories = useCallback(async (currentToken) => {
    if (!currentToken) return;
    setIsLoadingCategories(true);
    try {
      // Use the notes/categories endpoint in the main notes function
      const response = await fetch(`${API_BASE}/get-categories`, {
        headers: { 'Authorization': `Bearer ${currentToken}` },
      });
      if (!response.ok) {
         if (response.status === 401) {
           console.warn('Session expired while fetching categories.');
         }
        throw new Error(`Failed to fetch categories (${response.status})`);
      }
      const data = await response.json();
      const sortedCategories = Array.isArray(data) ? ['All', ...data.filter(cat => cat !== 'All').sort()] : ['All'];
      setAvailableCategories(sortedCategories);
    } catch (err) {
      console.error("Category fetch error:", err.message);
      setAvailableCategories(['All']);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchNotes(token);
      fetchCategories(token);
    }
  }, [token, fetchNotes, fetchCategories]);

  // --- Filtering ---
  useEffect(() => {
    let result = notes;

    if (selectedCategory !== 'All') {
      result = result.filter(note =>
        note.categories && note.categories.includes(selectedCategory)
      );
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(note =>
        note.title?.toLowerCase().includes(lowerSearchTerm) ||
        note.content?.toLowerCase().includes(lowerSearchTerm) ||
        note.summary?.toLowerCase().includes(lowerSearchTerm)
      );
    }

    setFilteredNotes(result);
  }, [notes, searchTerm, selectedCategory]);

  // --- Note Actions ---
  const handleNoteAdded = (newNote) => {
    setNotes(prevNotes => [newNote, ...prevNotes]);
    fetchCategories(token);
  };  const deleteNote = async (id) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/notes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Failed to delete note (${response.status})`);
      }
      setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
    } catch (err) {
      console.error("Error deleting note:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 pb-10">
      <div className="max-w-3xl mx-auto px-4">
        <Header onLogout={onLogout} />

        {error && (
          <div className="mb-6 p-4 border-l-4 border-red-500 bg-red-50 rounded-md">
            <div className="flex">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <AddNoteForm
          token={token}
          onNoteAdded={handleNoteAdded}
          setIsLoading={setIsLoading}
          isLoading={isLoading}
        />

        <FilterControls
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          availableCategories={availableCategories}
          isLoadingCategories={isLoadingCategories}
        />

        {/* Notes grid with responsive layout */}
        <div className="relative">
          {isLoadingNotes && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10 rounded-xl">
              <div className="flex flex-col items-center">
                <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="mt-2 text-sm font-medium text-gray-500">Loading notes...</span>
              </div>
            </div>
          )}

          {!isLoadingNotes && notes.length === 0 && !error && (
            <div className="bg-white rounded-xl shadow-md p-12 text-center border border-indigo-50">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-500 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No notes yet</h3>
              <p className="text-gray-500 mb-4">Create your first note using the form above</p>
            </div>
          )}

          {!isLoadingNotes && notes.length > 0 && filteredNotes.length === 0 && (
            <div className="bg-white rounded-xl shadow-md p-12 text-center border border-indigo-50">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-500 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No matching notes</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onDelete={deleteNote}
                isLoading={isLoading}
                onViewDetail={() => setSelectedNote(note)}
              />
            ))}
          </div>
        </div>

        {/* Note detail modal */}
        <NoteDetailModal note={selectedNote} onClose={() => setSelectedNote(null)} />
      </div>
      {/* Chat Assistant only on HomePage */}
      <ChatAssistant token={token} />
    </div>
  );
}

HomePage.propTypes = {
  token: PropTypes.string.isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default HomePage;
