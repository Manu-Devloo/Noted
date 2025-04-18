import PropTypes from 'prop-types';

function NoteDetailModal({ note, onClose }) {
  if (!note) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8 relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-red-500 focus:outline-none"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold mb-2 text-indigo-700">{note.title || 'Untitled Note'}</h2>
        {note.summary && (
          <div className="mb-3 text-sm text-gray-700 italic border-l-2 border-indigo-300 pl-3">{note.summary}</div>
        )}
        <div className="mb-4 text-gray-800 whitespace-pre-wrap text-base">
          {note.content}
        </div>
        {note.categories && note.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {note.categories.map(category => (
              <span key={category} className="inline-block bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full">
                {category}
              </span>
            ))}
          </div>
        )}
        <div className="text-xs text-gray-500 flex justify-between border-t pt-2">
          <span>Created: {note.createdAt ? new Date(note.createdAt).toLocaleString() : 'unknown'}</span>
          {note.updatedAt && <span>Updated: {new Date(note.updatedAt).toLocaleString()}</span>}
        </div>
      </div>
    </div>
  );
}

NoteDetailModal.propTypes = {
  note: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

export default NoteDetailModal;
