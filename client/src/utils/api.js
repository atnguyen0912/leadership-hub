// API utility - intercepts fetch to add auth headers automatically

const originalFetch = window.fetch;

function getToken() {
  return localStorage.getItem('token');
}

// Override global fetch to add auth headers for API calls
window.fetch = function(url, options = {}) {
  // Only add auth header for our API calls
  if (typeof url === 'string' && url.startsWith('/api') && !url.includes('/api/auth')) {
    const token = getToken();
    if (token) {
      options = {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        }
      };
    }
  }

  return originalFetch(url, options).then(response => {
    // Handle 401 - token expired or invalid (but not for auth routes)
    // Note: 403 means "permission denied" - user is authenticated but not authorized
    // We should NOT logout on 403, just show the error to the user
    if (response.status === 401 && typeof url === 'string' && !url.includes('/api/auth')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return response;
  });
};

// Export for explicit use if needed
export function initializeApi() {
  // Already initialized above when this module is imported
}

export default { initializeApi };
