// API utility - intercepts fetch to add auth headers and handle token expiration

const originalFetch = window.fetch;

function getToken() {
  return localStorage.getItem('token');
}

// Session expiration callback (set by App component)
let onSessionExpired = null;

export function setSessionExpiredCallback(callback) {
  onSessionExpired = callback;
}

// Track if we've already handled a session expiration (prevent multiple redirects)
let sessionExpirationHandled = false;

export function resetSessionExpirationFlag() {
  sessionExpirationHandled = false;
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

  return originalFetch(url, options).then(async response => {
    // Handle 401 - token expired or invalid (but not for auth routes)
    // Note: 403 means "permission denied" - user is authenticated but not authorized
    // We should NOT logout on 403, just show the error to the user
    if (response.status === 401 && typeof url === 'string' && !url.includes('/api/auth')) {
      // Only handle once to prevent multiple redirects
      if (!sessionExpirationHandled) {
        sessionExpirationHandled = true;

        // Clear stored auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Trigger session expired callback if set (preferred)
        if (onSessionExpired) {
          onSessionExpired();
        } else {
          // Fallback: hard redirect (less ideal but works)
          window.location.href = '/?session_expired=true';
        }
      }
    }

    // Handle 403 with "expired" in the error message (some endpoints return 403 for expired tokens)
    if (response.status === 403 && typeof url === 'string' && !url.includes('/api/auth')) {
      try {
        const data = await response.clone().json();
        if (data.error && data.error.toLowerCase().includes('expired')) {
          if (!sessionExpirationHandled) {
            sessionExpirationHandled = true;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (onSessionExpired) {
              onSessionExpired();
            } else {
              window.location.href = '/?session_expired=true';
            }
          }
        }
      } catch {
        // JSON parse failed, just return response
      }
    }

    return response;
  });
};

// Export for explicit use if needed
export function initializeApi() {
  // Already initialized above when this module is imported
}

export default {
  initializeApi,
  setSessionExpiredCallback,
  resetSessionExpirationFlag
};
