/**
 * Shared formatting and calculation utilities
 */

/**
 * Format a date string for display
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '-';
  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  };
  return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', defaultOptions);
};

/**
 * Format a date string with weekday
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Formatted date with weekday
 */
export const formatDateWithWeekday = (dateString) => {
  return formatDate(dateString, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Format a datetime string (includes time)
 * @param {string} dateTimeString - ISO datetime string
 * @returns {string} Formatted datetime
 */
export const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return '-';
  return new Date(dateTimeString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

/**
 * Format a number as US currency
 * @param {number} value - Amount in dollars
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value || 0);
};

/**
 * Format a time string (HH:MM) to readable format
 * @param {string} timeString - Time in HH:MM format
 * @returns {string} Formatted time (e.g., "3:30 PM")
 */
export const formatTime = (timeString) => {
  if (!timeString) return '-';
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

/**
 * Calculate minutes between two time strings
 * @param {string} timeIn - Start time in HH:MM format
 * @param {string} timeOut - End time in HH:MM format
 * @returns {number} Total minutes
 */
export const calculateMinutes = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) return 0;
  const [inHours, inMinutes] = timeIn.split(':').map(Number);
  const [outHours, outMinutes] = timeOut.split(':').map(Number);
  const inTotal = inHours * 60 + inMinutes;
  const outTotal = outHours * 60 + outMinutes;
  return outTotal - inTotal;
};

/**
 * Format minutes as hours and minutes string
 * @param {number} totalMinutes - Total minutes
 * @returns {string} Formatted string (e.g., "2h 30m")
 */
export const formatMinutes = (totalMinutes) => {
  const hrs = Math.floor(Math.abs(totalMinutes) / 60);
  const mins = Math.abs(totalMinutes) % 60;
  return `${hrs}h ${mins}m`;
};

/**
 * Calculate and format hours between two times
 * @param {string} timeIn - Start time in HH:MM format
 * @param {string} timeOut - End time in HH:MM format
 * @returns {string} Formatted duration (e.g., "2h 30m")
 */
export const calculateHours = (timeIn, timeOut) => {
  return formatMinutes(calculateMinutes(timeIn, timeOut));
};

/**
 * Calculate decimal hours between two times
 * @param {string} timeIn - Start time in HH:MM format
 * @param {string} timeOut - End time in HH:MM format
 * @returns {number} Hours as decimal
 */
export const calculateDecimalHours = (timeIn, timeOut) => {
  const minutes = calculateMinutes(timeIn, timeOut);
  return minutes / 60;
};
