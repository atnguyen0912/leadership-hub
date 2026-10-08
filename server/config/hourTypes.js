/**
 * Hour categories students pick from when logging time.
 *
 * Keep in sync with client/src/utils/hourTypes.js, which carries the same
 * values plus display colors. Anything unrecognized rolls up into 'other',
 * which is also the column default on the hours table.
 */

const HOUR_TYPES = [
  { value: 'poster_making', label: 'Poster Making' },
  { value: 'event_planning', label: 'Event Planning' },
  { value: 'concessions', label: 'Concessions' },
  { value: 'other', label: 'Other' }
];

const FALLBACK_TYPE = 'other';

/**
 * Map a stored hour_type to a known category
 * @param {string} value - Raw hour_type from the database
 * @returns {string} A value from HOUR_TYPES, falling back to 'other'
 */
function normalizeHourType(value) {
  return HOUR_TYPES.some(t => t.value === value) ? value : FALLBACK_TYPE;
}

/**
 * Human-readable label for an hour type
 * @param {string} value - Hour type value
 * @returns {string} Display label
 */
function hourTypeLabel(value) {
  const type = HOUR_TYPES.find(t => t.value === value);
  return type ? type.label : 'Other';
}

module.exports = { HOUR_TYPES, FALLBACK_TYPE, normalizeHourType, hourTypeLabel };
