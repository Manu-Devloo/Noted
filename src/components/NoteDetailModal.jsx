import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

function NoteDetailModal({ note, onClose, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(note || {});
  const [editError, setEditError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Ensure fields are loaded with the latest note when opening edit mode
  useEffect(() => {
    if (isEditing && note) {
      setEditData(note);
    }
  }, [isEditing, note]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setEditError(null);
    try {
      await onEdit(note.id, editData);
      setIsEditing(false);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setIsSaving(false);
    }
  };
  if (!note) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl max-w-lg w-full p-8 relative animate-slide-up overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-100/40 rounded-full filter blur-xl opacity-70"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-100/40 rounded-full filter blur-xl opacity-70"></div>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors focus:outline-none z-10"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="space-y-4 relative z-10">
            <h2 className="text-xl font-bold text-indigo-700 mb-4">Edit Note</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                name="title"
                value={editData.title || ''}
                onChange={handleEditChange}
                placeholder="Title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-4 py-3 min-h-[120px] shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 resize-none"
                name="content"
                value={editData.content || ''}
                onChange={handleEditChange}
                placeholder="Content"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                name="summary"
                value={editData.summary || ''}
                onChange={handleEditChange}
                placeholder="Summary"
              />
            </div>
            {editError && <div className="text-red-500 text-sm p-2 bg-red-50 rounded-lg">{editError}</div>}
            <div className="flex gap-3 justify-end pt-2">
              <button 
                type="button" 
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors" 
                onClick={() => setIsEditing(false)} 
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="relative overflow-hidden px-4 py-2 rounded-lg text-white transition-all duration-300 disabled:bg-gray-400" 
                disabled={isSaving}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 transition-transform hover:scale-105 duration-300 ease-out"></div>
                <span className="relative">{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-700">
                {note.title || 'Untitled Note'}
              </h2>
            </div>
            
            {note.summary && (
              <div className="mb-4 text-sm text-gray-700 italic border-l-3 border-indigo-300 pl-4 py-2 bg-indigo-50/50 rounded-r-lg">
                {note.summary}
              </div>
            )}
            
            <div className="mb-5 text-gray-800 whitespace-pre-wrap text-base leading-relaxed bg-white/70 backdrop-blur-sm p-4 rounded-lg border border-gray-100 shadow-sm">
              {note.content}
            </div>
            
            {note.categories && note.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {note.categories.map(category => (
                  <span key={category} className="inline-flex items-center bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full border border-indigo-100/50 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1.5"></span>
                    {category}
                  </span>
                ))}
              </div>
            )}
            
            <div className="text-xs text-gray-500 flex justify-between items-center py-3 border-t border-gray-200/70">
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Created: {note.createdAt ? new Date(note.createdAt).toLocaleString() : 'unknown'}
              </span>
              {note.updatedAt && (
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Updated: {new Date(note.updatedAt).toLocaleString()}
                </span>
              )}
            </div>
            
            <div className="flex justify-end mt-4">
              <button 
                className="relative overflow-hidden px-5 py-2.5 rounded-lg text-white shadow-md hover:shadow-lg transition-all duration-300" 
                onClick={() => setIsEditing(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 transition-transform hover:scale-105 duration-300 ease-out"></div>
                <span className="relative flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Note
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

NoteDetailModal.propTypes = {
  note: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
};

export default NoteDetailModal;
