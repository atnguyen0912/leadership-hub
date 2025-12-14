// Server Configuration
module.exports = {
  // JWT Configuration
  JWT: {
    EXPIRES_IN: '24h',
    SECRET_ENV: 'JWT_SECRET',
    DEFAULT_SECRET: 'leadership-hub-secret-change-in-production',
  },

  // HTTP Status Codes (for clarity)
  HTTP: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
  },

  // Database
  DB: {
    FILENAME: 'leadership.db',
    PRODUCTION_PATH: '/data',
  },

  // Default admin password (should be overridden via env)
  DEFAULT_ADMIN_PASSWORD: 'changeme123',
};
