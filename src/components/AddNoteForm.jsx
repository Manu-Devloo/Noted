import { useState } from 'react';
import PropTypes from 'prop-types';
import { apiRequest } from '../api';

function AddNoteForm({ token, onNoteAdded, setIsLoading, isLoading }) {
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteImages, setNewNoteImages] = useState([]);
  const [imageContext, setImageContext] = useState(''); // Optional context for image notes
  const [error, setError] = useState(null); // Local error state for the form
  const [activeTab, setActiveTab] = useState('text'); // Track active input method

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setNewNoteImages(files);
      setNewNoteText(''); // Clear text input if files are selected
      setError(null); // Clear error on change
    }
  };
  const handleTextChange = (e) => {
    setNewNoteText(e.target.value);
    setNewNoteImages([]); // Clear file input if text is entered
    setError(null); // Clear error on change
  };

  // Helper to split array into chunks
  function chunkArray(array, chunkSize) {
    const result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      result.push(array.slice(i, i + chunkSize));
    }
    return result;
  }

  const addNote = async (e) => {
    e.preventDefault();
    if (!newNoteText && newNoteImages.length === 0) return;
    if (!token) {
      setError('Authentication error. Please log in again.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (newNoteImages.length > 0) {
        const CHUNK_SIZE = 2;
        const imageDataArray = await Promise.all(newNoteImages.map(async (file) => ({ base64: await readFileAsBase64(file), name: file.name })));
        const chunks = chunkArray(imageDataArray, CHUNK_SIZE);
        let noteId = null;
        for (let i = 0; i < chunks.length; i++) {
          const isFirst = i === 0;
          const endpoint = isFirst ? '/notes' : '/notes/append';
          const body = isFirst
            ? { images: chunks[i], isMultipart: true, partIndex: i, totalParts: chunks.length, context: imageContext }
            : { noteId, images: chunks[i], isMultipart: true, partIndex: i, totalParts: chunks.length, context: imageContext };
          const response = await apiRequest(endpoint, 'POST', body, token);
          if (isFirst) noteId = response.id;
        }
      } else {
        await apiRequest('/notes', 'POST', { text: newNoteText }, token);
      }
      setNewNoteText('');
      setNewNoteImages([]);
      setImageContext('');
      onNoteAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };  // Helper function to read file as base64 with image resizing
  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      // Only resize images, pass through other file types
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        return;
      }

      // For images, resize before encoding to base64
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        
        // More aggressive resizing to further reduce processing time
        // Target dimensions - limit width/height to 800px max (reduced from 1200px)
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        // Set canvas size and draw resized image
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert canvas to base64 with lower quality for faster processing
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Reduced quality to 70% (from 85%)
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };
      
      img.src = objectUrl;
    });
  };
  return (
    <div className="mb-10 bg-white/90 backdrop-blur-sm p-7 rounded-xl shadow-lg border border-indigo-50/80 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute -top-12 -left-12 w-36 h-36 bg-indigo-100/40 rounded-full filter blur-xl opacity-80"></div>
      <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-purple-100/40 rounded-full filter blur-xl opacity-80"></div>
      
      <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center relative z-10">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white mr-3 shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
        </span>
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-700">Create New Note</span>
      </h2>
      
      {error && (
        <div className="mb-5 p-4 bg-red-50/90 backdrop-blur-sm border-l-4 border-red-500 rounded-lg shadow-sm">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="ml-3 text-sm font-medium text-red-700">{error}</p>
          </div>
        </div>
      )}      <div className="flex border-b border-gray-200/70 mb-5 relative z-10">
        <button 
          type="button"
          onClick={() => setActiveTab('text')}
          className={`py-3 px-5 font-medium text-sm focus:outline-none transition-all duration-300 ${
            activeTab === 'text' 
              ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50'
              : 'text-gray-500 hover:text-indigo-500 hover:bg-indigo-50/30'
          } rounded-t-lg`}
        >
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Text Note
          </div>
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('image')}
          className={`py-3 px-5 font-medium text-sm focus:outline-none transition-all duration-300 ${
            activeTab === 'image' 
              ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50'
              : 'text-gray-500 hover:text-indigo-500 hover:bg-indigo-50/30'
          } rounded-t-lg`}
        >
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Image Note
          </div>
        </button>
      </div>      <form onSubmit={addNote} className="relative z-10">
        {activeTab === 'text' && (
          <div className="mb-5">
            <textarea
              id="noteText"
              className="shadow-sm w-full h-32 p-4 text-gray-700 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 bg-white/80 backdrop-blur-sm hover:bg-white focus:bg-white"
              placeholder="What's on your mind?"
              value={newNoteText}
              onChange={handleTextChange}
              disabled={isLoading}
            ></textarea>
          </div>
        )}
        
        {activeTab === 'image' && (
          <div className="mb-5">
            <label className="flex flex-col items-center px-6 py-8 bg-white/80 backdrop-blur-sm text-indigo-500 rounded-xl border-2 border-dashed border-indigo-300 cursor-pointer hover:bg-indigo-50/70 hover:border-indigo-400 transition-all duration-300 group">
              <div className="w-16 h-16 mb-3 rounded-full bg-indigo-100/80 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-base font-medium mb-1 text-indigo-600 group-hover:text-indigo-700 transition-colors">Click to upload images</span>
              <span className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors">Select multiple files for multi-page notes</span>
              <input 
                id="noteImage"
                type="file"
                accept="image/*" 
                onChange={handleFileChange}
                className="hidden"
                disabled={isLoading}
                multiple
              />
            </label>
            {newNoteImages.length > 0 && (
              <div className="mt-4 p-4 bg-indigo-50/50 backdrop-blur-sm rounded-xl border border-indigo-100">
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {newNoteImages.length} {newNoteImages.length === 1 ? 'image' : 'images'} selected
                  </span>
                </div>
                <div className="text-xs text-gray-600 pl-8 max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent">
                  {newNoteImages.map((img, index) => (
                    <div key={index} className="truncate py-0.5 border-b border-indigo-50 last:border-0">{img.name}</div>
                  ))}
                </div>
              </div>
            )}
            <textarea 
              value={imageContext} 
              onChange={e => setImageContext(e.target.value)} 
              placeholder="Optional: Add context for the AI about these images" 
              className="mt-4 shadow-sm w-full p-4 text-gray-700 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 bg-white/80 backdrop-blur-sm hover:bg-white focus:bg-white h-20"
            />
          </div>
        )}

        <button
          type="submit"
          className={`relative w-full py-3.5 px-5 flex justify-center items-center font-medium rounded-xl shadow-md overflow-hidden group ${
            ((activeTab === 'text' && !newNoteText) || 
            (activeTab === 'image' && newNoteImages.length === 0) || 
            isLoading) 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'text-white'
          } transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
          disabled={(activeTab === 'text' && !newNoteText) || (activeTab === 'image' && newNoteImages.length === 0) || isLoading}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500 group-hover:from-indigo-600 group-hover:to-purple-700 group-hover:scale-102"></div>
          <span className="relative flex items-center">
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Note
              </>
            )}
          </span>
        </button>
      </form>
    </div>
  );
}

AddNoteForm.propTypes = {
  token: PropTypes.string,
  onNoteAdded: PropTypes.func.isRequired,
  setIsLoading: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
};

export default AddNoteForm;
