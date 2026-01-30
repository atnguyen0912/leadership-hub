import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const AuthContext = createContext(null);

// Decode JWT payload without verification (client-side only)
function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Check if token is expired (with 5 minute buffer)
function isTokenExpired(token) {
  if (!token) return true;
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  // Add 5 minute buffer before actual expiration
  const expirationTime = decoded.exp * 1000;
  const bufferTime = 5 * 60 * 1000; // 5 minutes
  return Date.now() > (expirationTime - bufferTime);
}

// Get time until token expires in milliseconds
function getTimeUntilExpiry(token) {
  if (!token) return 0;
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return 0;
  return Math.max(0, (decoded.exp * 1000) - Date.now());
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    // Check if token is expired on load
    if (savedToken && isTokenExpired(savedToken)) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('token');
    // Check if token is expired on load
    if (savedToken && isTokenExpired(savedToken)) {
      return null;
    }
    return savedToken;
  });

  const [sessionExpired, setSessionExpired] = useState(false);
  const expiryTimerRef = useRef(null);

  const logout = useCallback((expired = false) => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
    if (expired) {
      setSessionExpired(true);
    }
    // Clear any pending expiry timer
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  const login = useCallback((userData, authToken) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
    setUser(userData);
    setToken(authToken);
    setSessionExpired(false);
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  // Check token validity and handle API 401/403 responses
  const handleAuthError = useCallback(() => {
    logout(true);
  }, [logout]);

  // Set up token expiry timer
  useEffect(() => {
    if (token && !isTokenExpired(token)) {
      const timeUntilExpiry = getTimeUntilExpiry(token);
      // Set timer to logout 1 minute before expiry (to give warning time)
      const warningTime = Math.max(0, timeUntilExpiry - 60000);

      if (warningTime > 0) {
        expiryTimerRef.current = setTimeout(() => {
          // Token is about to expire
          logout(true);
        }, warningTime);
      }

      return () => {
        if (expiryTimerRef.current) {
          clearTimeout(expiryTimerRef.current);
        }
      };
    }
  }, [token, logout]);

  // Periodic token check (every minute)
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (token && isTokenExpired(token)) {
        logout(true);
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [token, logout]);

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user && !!token && !isTokenExpired(token),
    isAdmin: user?.type === 'admin',
    isStudent: user?.type === 'student',
    sessionExpired,
    clearSessionExpired,
    handleAuthError,
    isTokenExpired: () => isTokenExpired(token),
    getTokenExpiry: () => {
      const decoded = decodeToken(token);
      return decoded?.exp ? new Date(decoded.exp * 1000) : null;
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
