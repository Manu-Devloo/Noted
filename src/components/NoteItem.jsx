import PropTypes from 'prop-types';
import { formatDistanceToNow } from 'date-fns';

function NoteItem({ note, onDelete, isLoading, onViewDetail }) {
  const handleDelete = () => {
    // Optional: Add confirmation dialog here
    // if (window.confirm(`Are you sure you want to delete "${note.title}"?`)) {
         onDelete(note.id);
    // }
  };
  return (
    <div className="bg-white/90 backdrop-blur-sm p-5 rounded-xl shadow-md hover:shadow-xl border border-indigo-50/60 transition-all duration-300 hover:border-indigo-200/80 hover:-translate-y-1 relative group overflow-hidden">
      {/* Decorative accent gradient */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-xl"></div>
      
      {/* Background decorative elements */}
      <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-indigo-100/30 rounded-full filter blur-xl opacity-0 group-hover:opacity-80 transition-opacity duration-700"></div>
      <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-purple-100/30 rounded-full filter blur-xl opacity-0 group-hover:opacity-80 transition-opacity duration-500 delay-100"></div>
      
      <div className="pt-3 relative z-10">
        <button
          onClick={handleDelete}
          className="absolute top-1 right-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 focus:outline-none disabled:opacity-50 p-1.5 hover:bg-red-50 rounded-full"
          aria-label="Delete note"
          disabled={isLoading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
        <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-indigo-700 transition-colors duration-300">{note.title || 'Untitled Note'}</h3>        {note.summary && (
          <div className="mb-3 text-sm text-gray-700 italic border-l-2 border-indigo-300 pl-3 bg-indigo-50/50 py-1.5 rounded-r-md">
            {note.summary}
          </div>
        )}
        {note.content && (
          <div className="mb-4 text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
            {note.content.length > 200 
              ? `${note.content.substring(0, 200)}...` 
              : note.content}
          </div>
        )}
        {note.categories && note.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {note.categories.map(category => (
              <span key={category} className="inline-flex items-center bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full border border-indigo-100/50 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1.5"></span>
                {category}
              </span>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
          <span className="flex items-center group">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-indigo-400 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="group-hover:text-indigo-600 transition-colors">
              {note.createdAt 
                ? formatDistanceToNow(new Date(note.createdAt), { addSuffix: true }) 
                : 'date unknown'}
            </span>
          </span>
          <button 
            className="relative text-indigo-600 hover:text-indigo-800 p-1.5 hover:bg-indigo-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200 overflow-hidden" 
            onClick={onViewDetail}
          >
            <span className="sr-only">View detail</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

NoteItem.propTypes = {
  note: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    summary: PropTypes.string,
    content: PropTypes.string,
    categories: PropTypes.arrayOf(PropTypes.string),
    createdAt: PropTypes.string, // ISO string format
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onViewDetail: PropTypes.func,
};

export default NoteItem;
