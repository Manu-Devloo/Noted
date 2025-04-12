import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';

// Optional: Add a function to verify token validity on load
const API_BASE = '/.netlify/functions';
async function verifyTokenOnLoad(token) {
  if (!token) return false;
  try {
    const response = await fetch(`${API_BASE}/verify-token`, { // Assuming you have this endpoint
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await response.json();
    return response.ok && data.valid;
  } catch (error) {
    console.error("Token verification failed:", error);
    return false;
  }
}


function App() {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isLoadingToken, setIsLoadingToken] = useState(true); // Start loading initially

  // Verify token on initial load
  useEffect(() => {
    const checkToken = async () => {
      setIsLoadingToken(true);
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        const isValid = await verifyTokenOnLoad(storedToken);
        if (isValid) {
          setToken(storedToken);
          setIsTokenValid(true);
        } else {
          // Clear invalid token
          localStorage.removeItem('authToken');
          setToken(null);
          setIsTokenValid(false);
        }
      } else {
        setToken(null);
        setIsTokenValid(false);
      }
      setIsLoadingToken(false);
    };
    checkToken();
  }, []); // Run only once on mount

  const handleSetToken = (newToken) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
    setIsTokenValid(true); // Assume token from login/register is valid
    setIsLoadingToken(false); // Stop loading if we just set it
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setIsTokenValid(false);
  };

  // Show loading indicator while checking token
  if (isLoadingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p> 
      </div>
    );
  }

  // Conditionally render LoginPage or HomePage
  return (
    <> 
      {!isTokenValid ? (
        <LoginPage setToken={handleSetToken} />
      ) : (
        <HomePage token={token} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
