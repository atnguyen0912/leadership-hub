/**
 * Minimal CSV writer for positional rows.
 *
 * routes/reports.js has its own column-mapped writer for database rows; this
 * one takes the header and body arrays directly, which suits reports whose
 * columns are computed rather than read straight off a table.
 */

/**
 * Escape one CSV field
 * @param {*} value - Raw value
 * @returns {string} CSV-safe field
 */
function csvField(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Join a header row and body rows into CSV text
 * @param {Array} headers - Column headings
 * @param {Array<Array>} rows - Row values, in column order
 * @returns {string} CSV text with CRLF line endings
 */
function toCSV(headers, rows) {
  return [headers, ...rows].map(row => row.map(csvField).join(',')).join('\r\n');
}

module.exports = { csvField, toCSV };
