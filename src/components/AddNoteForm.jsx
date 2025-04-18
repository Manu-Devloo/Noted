import { useState } from 'react';
import PropTypes from 'prop-types';

const API_BASE = '/.netlify/functions';

function AddNoteForm({ token, onNoteAdded, setIsLoading, isLoading }) {
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteImages, setNewNoteImages] = useState([]);
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
      let requestBody;
      let headers = { 'Authorization': `Bearer ${token}` };
      // Set Content-Type for JSON payload
      headers['Content-Type'] = 'application/json';

      if (newNoteImages.length > 0) {
        // Handle image upload (single or multiple)
        if (newNoteImages.length === 1) {
          // Single image processing using the helper function
          try {
            const base64Image = await readFileAsBase64(newNoteImages[0]);
            // Ensure the backend expects 'image' for single uploads
            requestBody = JSON.stringify({ text: "Image note: " + newNoteImages[0].name, image: base64Image });
            await sendNoteRequest(requestBody, headers);
          } catch (readError) {
            console.error('Error processing single image:', readError);
            setError('Failed to process image data.');
            setIsLoading(false);
          }
        } else {
          // Multiple images - process as one combined note
          const processImages = async () => {
            try {
              const imageDataArray = [];
              // Process all images to base64
              for (let i = 0; i < newNoteImages.length; i++) {
                const imageFile = newNoteImages[i];
                const base64Image = await readFileAsBase64(imageFile);
                imageDataArray.push({
                  base64: base64Image,
                  name: imageFile.name, // Keep name for potential backend use
                  // index: i // Index might not be necessary unless order matters critically on backend
                });
              }

              // Combine all images into a single request
              // Ensure the backend expects 'images' array for multiple uploads
              const combinedRequest = {
                text: `Note from ${newNoteImages.length} images`, // More descriptive text
                images: imageDataArray // Send array of base64 strings with names
              };

              requestBody = JSON.stringify(combinedRequest);
              await sendNoteRequest(requestBody, headers);

            } catch (error) {
              console.error('Error processing multiple images:', error);
              setError('Failed to process one or more images.');
              setIsLoading(false); // Ensure loading state is reset on error
            }
          };

          await processImages(); // Await the async processing
          // No early return needed here, sendNoteRequest handles loading state now
        }
      } else {
        // Handle text note
        requestBody = JSON.stringify({ text: newNoteText });
        await sendNoteRequest(requestBody, headers);
      }
    } catch (err) {
      console.error("Error initiating note addition:", err);
      setError(err.message || 'An unexpected error occurred.');
      setIsLoading(false); // Ensure loading state is reset on top-level error
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
  const sendNoteRequest = async (requestBody, headers) => {
    try {
      // Check if this is a large payload that needs to be split
      const payloadSize = new Blob([requestBody]).size;
      const MAX_PAYLOAD_SIZE = 6 * 1024 * 1024; // 6MB in bytes
      
      // If it's a regular text note or small enough image, send as normal
      if (payloadSize <= MAX_PAYLOAD_SIZE) {
        const response = await fetch(`${API_BASE}/notes`, {
          method: 'POST',
          headers: headers,
          body: requestBody,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || `Failed to add note (${response.status})`);
        }
        onNoteAdded(data); // Pass the new note data up to the parent
        setNewNoteText('');
        setNewNoteImages([]); // Clear file input
        setError(null);
        return;
      }
        // For large multi-image payloads, we need to split them
      console.log(`Payload size (${(payloadSize / 1024 / 1024).toFixed(2)}MB) exceeds limit, splitting into chunks`);
      
      // Parse the original request to get the images array
      const originalRequest = JSON.parse(requestBody);
      if (!originalRequest.images || !Array.isArray(originalRequest.images)) {
        throw new Error("Expected images array for chunked upload");
      }
      
      // More aggressive splitting strategy - process images individually or in very small groups
      // This prevents timeouts by keeping each request small and quick to process
      const allImages = [...originalRequest.images];
      const MAX_IMAGES_PER_CHUNK = 2; // Process at most 2 images at a time to avoid timeouts
      const chunks = [];
      
      // Create chunks with at most MAX_IMAGES_PER_CHUNK images
      for (let i = 0; i < allImages.length; i += MAX_IMAGES_PER_CHUNK) {
        chunks.push(allImages.slice(i, i + MAX_IMAGES_PER_CHUNK));
      }
      
      console.log(`Split ${allImages.length} images into ${chunks.length} smaller chunks`);
      
      // Process the first chunk to get the initial AI analysis
      const firstChunkBody = JSON.stringify({
        text: originalRequest.text || "Note from multiple images",
        images: chunks[0],
        isMultipart: true,
        partIndex: 0,
        totalParts: chunks.length
      });
      
      const firstResponse = await fetch(`${API_BASE}/notes`, {
        method: 'POST',
        headers: headers,
        body: firstChunkBody,
      });
      
      let resultData = await firstResponse.json();
      if (!firstResponse.ok) {
        throw new Error(resultData.message || `Failed to process first chunk (${firstResponse.status})`);
      }
      
      // If there are more chunks, process them and update the note
      if (chunks.length > 1) {
        const noteId = resultData.id;
        
        // Process remaining chunks sequentially
        for (let i = 1; i < chunks.length; i++) {
          const chunkBody = JSON.stringify({
            images: chunks[i],
            isMultipart: true,
            partIndex: i,
            totalParts: chunks.length,
            noteId: noteId
          });
          
          // Set a custom status message during processing
          setError(`Processing chunk ${i + 1} of ${chunks.length}...`);
          
          const chunkResponse = await fetch(`${API_BASE}/notes/append`, {
            method: 'POST',
            headers: headers,
            body: chunkBody,
          });
          
          const chunkResult = await chunkResponse.json();
          if (!chunkResponse.ok) {
            throw new Error(chunkResult.message || `Failed to process chunk ${i + 1} (${chunkResponse.status})`);
          }
          
          // Update with the latest complete data
          resultData = chunkResult;
        }
      }
      
      onNoteAdded(resultData);
      setNewNoteText('');
      setNewNoteImages([]);
      setError(null);
      
    } catch (err) {
      console.error("Error sending note request:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-8 bg-white p-6 rounded-xl shadow-md border border-indigo-50">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
        </svg>
        Create New Note
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-md">
          <div className="flex">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="ml-2 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="flex border-b border-gray-200 mb-4">
        <button 
          type="button"
          onClick={() => setActiveTab('text')}
          className={`py-2 px-4 font-medium text-sm ${
            activeTab === 'text' 
              ? 'text-indigo-600 border-b-2 border-indigo-500'
              : 'text-gray-500 hover:text-indigo-500'
          } focus:outline-none transition-colors`}
        >
          Text Note
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('image')}
          className={`py-2 px-4 font-medium text-sm ${
            activeTab === 'image' 
              ? 'text-indigo-600 border-b-2 border-indigo-500'
              : 'text-gray-500 hover:text-indigo-500'
          } focus:outline-none transition-colors`}
        >
          Image Note
        </button>
      </div>      <form onSubmit={addNote}>
        {activeTab === 'text' && (
          <div className="mb-4">
            <textarea
              id="noteText"
              className="shadow-sm w-full h-28 p-3 text-gray-700 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              placeholder="What's on your mind?"
              value={newNoteText}
              onChange={handleTextChange}
              disabled={isLoading}
            ></textarea>
          </div>
        )}        {activeTab === 'image' && (
          <div className="mb-4">
            <label className="flex flex-col items-center px-4 py-6 bg-white text-indigo-500 rounded-lg border border-dashed border-indigo-400 cursor-pointer hover:bg-indigo-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium mb-1">Click to upload images</span>
              <span className="text-xs text-gray-500">Select multiple files for multi-page notes</span>
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
              <div className="mt-3">
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    {newNoteImages.length} {newNoteImages.length === 1 ? 'image' : 'images'} selected
                  </span>
                </div>
                <div className="text-xs text-gray-500 pl-6">
                  {newNoteImages.map((img, index) => (
                    <div key={index} className="truncate">{img.name}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}<button
          type="submit"
          className={`w-full py-3 px-4 flex justify-center items-center font-medium rounded-lg shadow-sm ${
            ((activeTab === 'text' && !newNoteText) || 
            (activeTab === 'image' && newNoteImages.length === 0) || 
            isLoading) 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
          } focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200`}
          disabled={(activeTab === 'text' && !newNoteText) || (activeTab === 'image' && newNoteImages.length === 0) || isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            'Add Note'
          )}
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
