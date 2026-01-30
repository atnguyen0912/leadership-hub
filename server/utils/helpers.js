/**
 * Shared helper functions for cashbox operations
 */

/**
 * Calculate total dollar value from denomination counts
 * @param {Object} denominations - Object with denomination counts
 * @returns {number} Total value in dollars
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
  } = denominations || {};

  return (
    (quarters * 0.25) +
    (bills_1 * 1) +
    (bills_5 * 5) +
    (bills_10 * 10) +
    (bills_20 * 20) +
    (bills_50 * 50) +
    (bills_100 * 100)
  );
}

/**
 * Validate that all denomination values are non-negative integers
 * @param {Object} denominations - Object with denomination counts
 * @returns {boolean} True if all values are valid
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
  } = denominations || {};

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
 * Check if user has a specific permission
 * @param {Object} user - User object with permissions array
 * @param {string} permission - Permission string to check
 * @returns {boolean} True if user has the permission
 */
function hasPermission(user, permission) {
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission) || user.permissions.includes('*');
}

module.exports = {
  calculateTotal,
  validateDenominations,
  hasPermission
};
