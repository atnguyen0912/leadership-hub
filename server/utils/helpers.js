/**
 * Shared Helper Functions
 *
 * Common utility functions used across different routes
 */

/**
 * Calculate the total cash value from denomination counts
 * @param {Object} denominations - Object containing denomination counts
 * @param {number} denominations.quarters - Number of quarters ($0.25)
 * @param {number} denominations.bills_1 - Number of $1 bills
 * @param {number} denominations.bills_5 - Number of $5 bills
 * @param {number} denominations.bills_10 - Number of $10 bills
 * @param {number} denominations.bills_20 - Number of $20 bills
 * @param {number} denominations.bills_50 - Number of $50 bills
 * @param {number} denominations.bills_100 - Number of $100 bills
 * @returns {number} Total cash value in dollars
 */
function calculateTotal(denominations) {
  const {
    quarters = 0,
    bills_1 = 0,
    bills_5 = 0,
    bills_10 = 0,
    bills_20 = 0,
    bills_50 = 0,
    bills_100 = 0
  } = denominations;

  return (
    quarters * 0.25 +
    bills_1 * 1 +
    bills_5 * 5 +
    bills_10 * 10 +
    bills_20 * 20 +
    bills_50 * 50 +
    bills_100 * 100
  );
}

/**
 * Validate that all denomination counts are non-negative
 * @param {Object} denominations - Object containing denomination counts
 * @returns {boolean} True if all denominations are valid (non-negative)
 */
function validateDenominations(denominations) {
  const {
    quarters = 0,
    bills_1 = 0,
    bills_5 = 0,
    bills_10 = 0,
    bills_20 = 0,
    bills_50 = 0,
    bills_100 = 0
  } = denominations;

  return (
    quarters >= 0 &&
    bills_1 >= 0 &&
    bills_5 >= 0 &&
    bills_10 >= 0 &&
    bills_20 >= 0 &&
    bills_50 >= 0 &&
    bills_100 >= 0
  );
}

/**
 * Check if a user has a specific permission
 * This is a placeholder - actual permission checking should use the middleware
 * @param {Object} user - User object with permissions
 * @param {string} permission - Permission string to check
 * @returns {boolean} True if user has the permission
 */
function hasPermission(user, permission) {
  // This is a basic implementation
  // For production use, use the requirePermission middleware instead
  if (!user || !user.permissions) {
    return false;
  }
  return user.permissions.includes(permission);
}

module.exports = {
  calculateTotal,
  validateDenominations,
  hasPermission
};
