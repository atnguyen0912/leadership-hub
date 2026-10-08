/**
 * Hours grouped into certificate-sized blocks.
 *
 * A whole year's hours on one certificate arrives long after the work; these
 * split a student's entries into the stretches worth recognizing on their own
 * — a week of poster making, a season of concessions, a month of service — so
 * a certificate can be printed while the activity is still fresh.
 *
 * Grouping is pure; the database read is shared with the per-student report.
 */

const { HOUR_TYPES, normalizeHourType, hourTypeLabel } = require('../config/hourTypes');
const { toCSV } = require('./csv');
const schoolYear = require('./schoolYear');
const {
  minutesBetween,
  formatMinutes,
  decimalHours,
  roleLabel,
  loadHoursData
} = require('./hoursReport');

// How a student's entries are cut into certificates.
const GROUP_MODES = [
  {
    value: 'run',
    label: 'Consecutive days of one activity',
    description: 'A new certificate each time the activity changes or the dates break'
  },
  {
    value: 'activity',
    label: 'Activity',
    description: 'One certificate per activity, however spread out the dates are'
  },
  {
    value: 'type',
    label: 'Hour type',
    description: 'One certificate per category — posters, concessions, and so on'
  },
  {
    value: 'month',
    label: 'Month',
    description: 'One certificate per calendar month of service'
  }
];

const DEFAULT_MODE = 'run';

// Fri -> Mon is a three-day gap, so a run survives a weekend by default without
// also swallowing an unrelated activity two weeks later.
const DEFAULT_MAX_GAP_DAYS = 3;

const SORTS = ['recent', 'student', 'hours'];
const DEFAULT_SORT = 'recent';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Days since the epoch for a YYYY-MM-DD date
 *
 * Parsed as UTC so a run never gains or loses a day to the server's timezone.
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {number|null} Whole days, or null if the date is unusable
 */
function dayNumber(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(dateStr || ''))) return null;
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/**
 * Month label for a date, e.g. "September 2025"
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} Month and year
 */
function monthLabel(dateStr) {
  const [y, m] = dateStr.slice(0, 7).split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/**
 * The activity an entry belongs to
 *
 * The free-text item is what a student would recognize on a certificate, so it
 * wins; entries logged without one fall back to their category.
 * @param {object} entry - Hour row
 * @returns {{key: string, label: string}} Match key and display label
 */
function activityOf(entry) {
  const item = String(entry.item || '').trim();
  if (item) {
    // Match on a squashed, case-insensitive form so "Football concessions" and
    // "football  Concessions" land on the same certificate.
    return { key: `item:${item.toLowerCase().replace(/\s+/g, ' ')}`, label: item };
  }
  const type = normalizeHourType(entry.hour_type);
  return { key: `type:${type}`, label: hourTypeLabel(type) };
}

/**
 * The bucket an entry falls in, before any date splitting
 * @param {object} entry - Hour row
 * @param {string} mode - One of GROUP_MODES
 * @returns {{key: string, label: string}} Match key and display label
 */
function bucketOf(entry, mode) {
  if (mode === 'type') {
    const type = normalizeHourType(entry.hour_type);
    return { key: `type:${type}`, label: hourTypeLabel(type) };
  }
  if (mode === 'month') {
    const month = String(entry.date || '').slice(0, 7);
    return { key: `month:${month}`, label: monthLabel(entry.date) };
  }
  return activityOf(entry);
}

/**
 * Turn a set of entries for one student into a finished group
 * @param {object} student - Student row
 * @param {object} bucket - Match key and label the entries share
 * @param {Array} entries - Hour rows, sorted by date
 * @returns {object} Group record
 */
function describeGroup(student, bucket, entries) {
  const dates = [...new Set(entries.map(entry => entry.date))].sort();
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const minutesByType = {};
  const items = new Set();
  let totalMinutes = 0;

  entries.forEach(entry => {
    const minutes = minutesBetween(entry.time_in, entry.time_out);
    const type = normalizeHourType(entry.hour_type);
    totalMinutes += minutes;
    minutesByType[type] = (minutesByType[type] || 0) + minutes;
    const item = String(entry.item || '').trim();
    if (item) items.add(item);
  });

  const years = [...new Set(dates.map(date => schoolYear.labelForDate(date)).filter(Boolean))];

  return {
    id: `${student.student_id}|${bucket.key}|${startDate}`,
    studentId: student.student_id,
    name: student.name,
    role: roleLabel(student),
    status: student.is_former ? 'Former' : 'Active',
    activity: bucket.label,
    startDate,
    endDate,
    days: dates.length,
    // The calendar span, which differs from `days` whenever the run skips a
    // weekend or a day off.
    spanDays: dayNumber(endDate) - dayNumber(startDate) + 1,
    dates,
    entries: entries.length,
    totalMinutes,
    totalHours: decimalHours(totalMinutes),
    totalFormatted: formatMinutes(totalMinutes),
    items: [...items].sort(),
    schoolYears: years.sort().reverse(),
    byType: HOUR_TYPES
      .filter(type => minutesByType[type.value])
      .map(type => ({
        value: type.value,
        label: type.label,
        hours: decimalHours(minutesByType[type.value]),
        formatted: formatMinutes(minutesByType[type.value])
      }))
  };
}

/**
 * Split a student's entries into certificate-sized groups
 *
 * Every entry passed in is used; narrowing to a school year is the caller's
 * job (loadHoursData does it in SQL).
 * @param {object} input - Grouping inputs
 * @param {Array} input.students - Student rows
 * @param {Array} input.entries - Hour rows, already filtered to the range
 * @param {string} [input.mode] - One of GROUP_MODES
 * @param {number} [input.maxGapDays] - Largest date gap a run tolerates; 'run' mode only
 * @param {number} [input.minHours] - Drop groups shorter than this
 * @param {number} [input.minDays] - Drop groups covering fewer days than this
 * @param {string} [input.sort] - 'recent', 'student' or 'hours'
 * @returns {{mode: string, maxGapDays: number, groups: Array, totals: object, unmatched: object}} Grouped result
 */
function groupHours({
  students = [],
  entries = [],
  mode = DEFAULT_MODE,
  maxGapDays = DEFAULT_MAX_GAP_DAYS,
  minHours = 0,
  minDays = 0,
  sort = DEFAULT_SORT
} = {}) {
  const groupMode = GROUP_MODES.some(m => m.value === mode) ? mode : DEFAULT_MODE;
  const gap = Number.isFinite(Number(maxGapDays)) ? Math.max(0, Number(maxGapDays)) : DEFAULT_MAX_GAP_DAYS;
  const studentsById = new Map(students.map(student => [student.student_id, student]));

  // Entries whose student is not in this report have no certificate to print.
  const unmatched = { entries: 0, minutes: 0 };
  const byStudent = new Map();

  entries.forEach(entry => {
    if (!studentsById.has(entry.student_id) || dayNumber(entry.date) === null) {
      unmatched.entries += 1;
      unmatched.minutes += minutesBetween(entry.time_in, entry.time_out);
      return;
    }
    if (!byStudent.has(entry.student_id)) byStudent.set(entry.student_id, []);
    byStudent.get(entry.student_id).push(entry);
  });

  const groups = [];

  byStudent.forEach((studentEntries, studentId) => {
    const student = studentsById.get(studentId);
    const buckets = new Map();

    studentEntries
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || String(a.time_in).localeCompare(String(b.time_in)))
      .forEach(entry => {
        const bucket = bucketOf(entry, groupMode);
        if (!buckets.has(bucket.key)) buckets.set(bucket.key, { bucket, entries: [] });
        buckets.get(bucket.key).entries.push(entry);
      });

    buckets.forEach(({ bucket, entries: bucketEntries }) => {
      if (groupMode !== 'run') {
        groups.push(describeGroup(student, bucket, bucketEntries));
        return;
      }

      // Walk the dates in order and cut a new certificate wherever the break
      // between one day and the next is longer than the tolerated gap.
      let run = [];
      let previousDay = null;

      bucketEntries.forEach(entry => {
        const day = dayNumber(entry.date);
        if (previousDay !== null && day - previousDay > gap) {
          groups.push(describeGroup(student, bucket, run));
          run = [];
        }
        run.push(entry);
        previousDay = day;
      });

      if (run.length) groups.push(describeGroup(student, bucket, run));
    });
  });

  const minMinutes = Math.max(0, Number(minHours) || 0) * 60;
  const dayFloor = Math.max(0, Number(minDays) || 0);
  const kept = groups.filter(group => group.totalMinutes >= minMinutes && group.days >= dayFloor);

  const sortMode = SORTS.includes(sort) ? sort : DEFAULT_SORT;
  kept.sort((a, b) => {
    if (sortMode === 'student') {
      return a.name.localeCompare(b.name) || a.startDate.localeCompare(b.startDate);
    }
    if (sortMode === 'hours') {
      return b.totalMinutes - a.totalMinutes || a.name.localeCompare(b.name);
    }
    // 'recent': most recently finished first, so what just wrapped up prints first.
    return b.endDate.localeCompare(a.endDate) || a.name.localeCompare(b.name);
  });

  const totalMinutes = kept.reduce((sum, group) => sum + group.totalMinutes, 0);
  const hiddenMinutes = groups.reduce((sum, group) => sum + group.totalMinutes, 0) - totalMinutes;

  return {
    mode: groupMode,
    maxGapDays: gap,
    groups: kept,
    totals: {
      groups: kept.length,
      students: new Set(kept.map(group => group.studentId)).size,
      hours: decimalHours(totalMinutes),
      hoursFormatted: formatMinutes(totalMinutes),
      entries: kept.reduce((sum, group) => sum + group.entries, 0)
    },
    belowThreshold: {
      groups: groups.length - kept.length,
      hours: decimalHours(hiddenMinutes),
      formatted: formatMinutes(hiddenMinutes)
    },
    unmatched: {
      entries: unmatched.entries,
      hours: decimalHours(unmatched.minutes),
      formatted: formatMinutes(unmatched.minutes)
    }
  };
}

/**
 * One row per group — the shape to mail-merge onto per-activity certificates
 * @param {object} result - Result from groupHours
 * @returns {string} CSV text
 */
function groupsCSV(result) {
  const headers = [
    'Name', 'Student ID', 'Status', 'Role', 'Activity', 'School Year',
    'Start Date', 'End Date', 'Days', 'Calendar Span', 'Entries',
    'Total Hours', 'Total Time', 'Hour Types', 'Activities'
  ];

  const rows = result.groups.map(group => [
    group.name,
    group.studentId,
    group.status,
    group.role,
    group.activity,
    group.schoolYears.join('; '),
    group.startDate,
    group.endDate,
    group.days,
    group.spanDays,
    group.entries,
    group.totalHours.toFixed(2),
    group.totalFormatted,
    group.byType.map(type => type.label).join('; '),
    group.items.join('; ')
  ]);

  return toCSV(headers, rows);
}

/**
 * Load hours from the database and split them into certificate groups
 * @param {object} [options] - Query options, as loadHoursData, plus the groupHours inputs
 * @returns {Promise<object>} Grouped result with the resolved year and available years
 */
async function fetchGroups({
  year,
  includeFormer = true,
  hourType = '',
  studentId = '',
  mode = DEFAULT_MODE,
  maxGapDays = DEFAULT_MAX_GAP_DAYS,
  minHours = 0,
  minDays = 0,
  sort = DEFAULT_SORT
} = {}) {
  const data = await loadHoursData({ year, includeFormer, hourType, studentId });
  const result = groupHours({
    students: data.students,
    entries: data.entries,
    mode,
    maxGapDays,
    minHours,
    minDays,
    sort
  });

  return {
    ...result,
    year: data.year,
    yearLabel: data.year === 'all' ? 'All Years' : data.year,
    range: data.range,
    availableYears: data.availableYears,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  GROUP_MODES,
  DEFAULT_MODE,
  DEFAULT_MAX_GAP_DAYS,
  SORTS,
  DEFAULT_SORT,
  dayNumber,
  monthLabel,
  activityOf,
  groupHours,
  groupsCSV,
  fetchGroups
};
