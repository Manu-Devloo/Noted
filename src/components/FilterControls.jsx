import PropTypes from 'prop-types';

function FilterControls({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  availableCategories,
  isLoadingCategories,
}) {  return (
    <div className="mb-8 bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-indigo-50/60 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-100/50 rounded-full filter blur-xl opacity-60"></div>
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-100/50 rounded-full filter blur-xl opacity-60"></div>
      
      <div className="flex flex-col md:flex-row gap-5 relative z-10">
        <div className="flex-grow relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            id="search"
            placeholder="Search in notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 block w-full text-sm border border-gray-300 rounded-xl py-3.5 transition-all duration-300 bg-white/80 backdrop-blur-sm hover:bg-white focus:bg-white"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
        <div className="md:w-72">
          <div className="relative group">
            <select
              id="categoryFilter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full pl-4 pr-10 py-3.5 text-sm border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 rounded-xl appearance-none disabled:bg-gray-100 transition-all duration-300 bg-white/80 backdrop-blur-sm hover:bg-white focus:bg-white shadow-sm"
              disabled={isLoadingCategories}
            >
              {isLoadingCategories ? (
                <option>Loading categories...</option>
              ) : (
                availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-indigo-500 group-hover:text-indigo-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="absolute -top-3 left-3">
              <span className="bg-white px-2 py-0.5 text-xs font-medium text-indigo-600 rounded-full shadow-sm border border-indigo-100/50">Filter by Category</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

FilterControls.propTypes = {
  searchTerm: PropTypes.string.isRequired,
  setSearchTerm: PropTypes.func.isRequired,
  selectedCategory: PropTypes.string.isRequired,
  setSelectedCategory: PropTypes.func.isRequired,
  availableCategories: PropTypes.arrayOf(PropTypes.string).isRequired,
  isLoadingCategories: PropTypes.bool.isRequired,
};

export default FilterControls;
