module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/server/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['./server/__tests__/setup.js'],
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
};
