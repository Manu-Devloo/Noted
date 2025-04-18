import { useState } from 'react';
import PropTypes from 'prop-types';

const API_BASE = '/.netlify/functions';

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
    setMessages((msgs) => [...msgs, userMsg]);
    setInput('');
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error');
      setMessages((msgs) => [...msgs, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white rounded-full shadow-lg p-4 hover:bg-indigo-700 transition"
        onClick={() => setIsOpen(true)}
        aria-label="Open Chat Assistant"
      >
        💬
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 bg-white shadow-2xl rounded-lg border border-indigo-200 flex flex-col ${isExpanded ? 'w-[90vw] h-[80vh] max-w-2xl' : 'w-80 h-96'} transition-all`}>
      <div className="flex items-center justify-between p-2 border-b bg-indigo-50 rounded-t-lg">
        <span className="font-semibold text-indigo-700">Chat Assistant</span>
        <div className="flex gap-2">
          <button onClick={() => setIsExpanded((v) => !v)} className="text-indigo-500 hover:text-indigo-700" title={isExpanded ? 'Minimize' : 'Expand'}>
            {isExpanded ? '🗕' : '🗖'}
          </button>
          <button onClick={() => setIsOpen(false)} className="text-rose-500 hover:text-rose-700" title="Close">✕</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
        {messages.length === 0 && (
          <div className="text-gray-400 text-sm text-center mt-8">Start a conversation with your notes-aware assistant!</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`whitespace-pre-line text-sm ${msg.role === 'user' ? 'text-right' : 'text-left'} ${msg.role === 'user' ? 'text-indigo-700' : 'text-gray-800 bg-indigo-50 rounded p-2'}`}>{msg.content}</div>
        ))}
        {isLoading && <div className="text-gray-400 text-xs">Assistant is typing...</div>}
        {error && <div className="text-rose-500 text-xs">{error}</div>}
      </div>
      <form onSubmit={handleSend} className="p-2 border-t flex gap-2 bg-white">
        <input
          className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring focus:border-indigo-400"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button type="submit" className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 text-sm" disabled={isLoading || !input.trim()}>Send</button>
      </form>
    </div>
  );
}

ChatAssistant.propTypes = {
  token: PropTypes.string.isRequired,
};

export default ChatAssistant;
