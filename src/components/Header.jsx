import PropTypes from 'prop-types';

function Header({ onLogout }) {
  return (
    <header className="flex justify-between items-center mb-10 pb-6 border-b border-indigo-100/30 relative">
      {/* Decorative elements */}
      <div className="absolute -top-6 -left-8 w-24 h-24 bg-indigo-200 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -top-6 -right-8 w-24 h-24 bg-purple-200 rounded-full filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="flex items-center group relative z-10">
        <div className="absolute -inset-3 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur"></div>
        <div className="relative bg-white/50 p-1.5 rounded-xl backdrop-blur-sm shadow-sm group-hover:shadow-md transition-all duration-300 border border-indigo-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-indigo-600 group-hover:text-indigo-700 transition-colors" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </div>
        <h1 className="ml-3 text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-br from-indigo-600 to-purple-700 tracking-tight relative">
          Noted
          <span className="absolute -bottom-1.5 left-0 right-0 h-1 bg-gradient-to-r from-indigo-300/40 to-purple-300/40 rounded-full"></span>
        </h1>
      </div>
      
      <button
        onClick={onLogout}
        className="group relative px-5 py-2.5 text-sm font-medium text-white overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-rose-600 transition-transform group-hover:scale-105 duration-300 ease-out"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-rose-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <span className="relative flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 group-hover:translate-x-0.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </span>
      </button>
    </header>
  );
}

Header.propTypes = {
  onLogout: PropTypes.func.isRequired,
};

export default Header;
