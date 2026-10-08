/**
 * School-year helpers.
 *
 * The hours table only stores a plain YYYY-MM-DD date, so the school year an
 * entry belongs to is derived from that date rather than stored. A school year
 * runs Aug 1 -> Jul 31 and is labeled by both calendar years: "2025-26" covers
 * 2025-08-01 through 2026-07-31.
 */

// Hours logged in August or later belong to the school year starting that year.
const START_MONTH = 8;

/**
 * Calendar year the school year containing this date started in
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {number|null} Starting calendar year, or null if the date is unusable
 */
function startYearForDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(dateStr || ''))) return null;
  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(5, 7));
  return month >= START_MONTH ? year : year - 1;
}

/**
 * Build the display label for a school year
 * @param {number} startYear - Calendar year the school year starts in
 * @returns {string} Label such as "2025-26"
 */
function labelForStartYear(startYear) {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/**
 * School year label a given date falls in
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string|null} Label such as "2025-26", or null if the date is unusable
 */
function labelForDate(dateStr) {
  const startYear = startYearForDate(dateStr);
  return startYear === null ? null : labelForStartYear(startYear);
}

/**
 * Date range covered by a school year label
 * @param {string} label - Label such as "2025-26"
 * @returns {{startYear: number, startDate: string, endDate: string}|null} Range, or null if the label is invalid
 */
function rangeForLabel(label) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(label || '').trim());
  if (!match) return null;

  const startYear = Number(match[1]);
  // Reject labels whose halves disagree, e.g. "2025-30", so a typo surfaces as
  // an error instead of silently reporting on the wrong year.
  if (Number(match[2]) !== (startYear + 1) % 100) return null;

  return {
    startYear,
    startDate: `${startYear}-${String(START_MONTH).padStart(2, '0')}-01`,
    endDate: `${startYear + 1}-${String(START_MONTH - 1).padStart(2, '0')}-31`
  };
}

/**
 * School year label for the current date
 * @param {Date} [now] - Reference date, defaults to today
 * @returns {string} Label such as "2025-26"
 */
function currentLabel(now = new Date()) {
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return labelForStartYear(month >= START_MONTH ? year : year - 1);
}

/**
 * Collect the school year labels present in a set of dates, newest first
 * @param {string[]} dates - Dates in YYYY-MM-DD format
 * @returns {string[]} Sorted labels such as ["2025-26", "2024-25"]
 */
function labelsForDates(dates) {
  const startYears = new Set();
  (dates || []).forEach(date => {
    const startYear = startYearForDate(date);
    if (startYear !== null) startYears.add(startYear);
  });
  return [...startYears].sort((a, b) => b - a).map(labelForStartYear);
}

module.exports = {
  START_MONTH,
  startYearForDate,
  labelForStartYear,
  labelForDate,
  rangeForLabel,
  currentLabel,
  labelsForDates
};
