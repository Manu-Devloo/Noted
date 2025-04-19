import { useState } from 'react';
import PropTypes from 'prop-types';
import { apiRequest } from '../api';

function ChatAssistant({ token }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setIsLoading(true);
    setError(null);
    const userMsg = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    try {
      const data = await apiRequest('/chat', 'POST', {
        message: input,
        history: messages.filter(m => m.role !== 'system'), // Only send user/assistant turns
      }, token);
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg p-4 hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 hover:shadow-xl transform hover:scale-110 animate-fade-in-up"
        onClick={() => setIsOpen(true)}
        aria-label="Open Chat Assistant"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 bg-white/95 backdrop-blur-sm shadow-2xl rounded-xl border border-indigo-100 flex flex-col ${isExpanded ? 'w-[90vw] h-[80vh] max-w-2xl' : 'w-96 h-[28rem]'} transition-all duration-300 animate-fade-in-scale`}>
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-xl">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center mr-2 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-700">Chat Assistant</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsExpanded((v) => !v)} 
            className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50/80 p-1.5 rounded-lg transition-colors" 
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50/80 p-1.5 rounded-lg transition-colors" 
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white/50 backdrop-blur-sm">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm max-w-xs">Start a conversation with your AI assistant. Ask questions about your notes or anything else!</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] whitespace-pre-line text-sm rounded-2xl px-4 py-3 
              ${msg.role === 'user' 
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' 
                : 'bg-gray-100 text-gray-800'}`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-2 max-w-[85%]">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2 border border-red-100">
              {error}
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSend} className="p-3 border-t border-indigo-50 flex gap-2 bg-white/90 backdrop-blur-sm rounded-b-xl">
        <input
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-300 bg-white/80 backdrop-blur-sm transition-all duration-300"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-xl hover:shadow-md transition-all duration-300 flex items-center justify-center disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-100" 
          disabled={isLoading || !input.trim()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </form>
    </div>
  );
}

ChatAssistant.propTypes = {
  token: PropTypes.string.isRequired,
};

export default ChatAssistant;
