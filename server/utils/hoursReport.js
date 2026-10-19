/**
 * Per-student service hours report.
 *
 * The dashboard leaderboard deliberately shows only active students and has no
 * year dimension, so hours from past school years are invisible there. This
 * builds the complementary view: every field needed to print a certificate or
 * fill out a service form, for any school year still in the database.
 *
 * The DB query lives in fetchReport; the shaping below is pure so it can be
 * tested without a database.
 */

const { all } = require('../db-utils');
const { HOUR_TYPES, normalizeHourType, hourTypeLabel } = require('../config/hourTypes');
const { toCSV } = require('./csv');
const schoolYear = require('./schoolYear');

const ALL_YEARS = 'all';

/**
 * Minutes between two HH:MM times
 *
 * Entries are validated on write so time_out is always after time_in on the
 * same day; no overnight handling is needed.
 * @param {string} timeIn - Start time in HH:MM format
 * @param {string} timeOut - End time in HH:MM format
 * @returns {number} Whole minutes, never negative
 */
function minutesBetween(timeIn, timeOut) {
  const [inH, inM] = String(timeIn || '').split(':').map(Number);
  const [outH, outM] = String(timeOut || '').split(':').map(Number);
  if ([inH, inM, outH, outM].some(n => !Number.isFinite(n))) return 0;
  return Math.max(0, (outH * 60 + outM) - (inH * 60 + inM));
}

/**
 * Format minutes as "2h 30m"
 * @param {number} totalMinutes - Total minutes
 * @returns {string} Formatted duration
 */
function formatMinutes(totalMinutes) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/**
 * Minutes as decimal hours rounded to two places
 * @param {number} totalMinutes - Total minutes
 * @returns {number} Decimal hours
 */
function decimalHours(totalMinutes) {
  return Math.round((totalMinutes / 60) * 100) / 100;
}

function emptyTypeTotals() {
  const totals = {};
  HOUR_TYPES.forEach(type => { totals[type.value] = 0; });
  return totals;
}

function describeTypeTotals(minutesByType) {
  return HOUR_TYPES.map(type => ({
    value: type.value,
    label: type.label,
    hours: decimalHours(minutesByType[type.value] || 0),
    formatted: formatMinutes(minutesByType[type.value] || 0)
  }));
}

/**
 * Role as it should read on a certificate
 * @param {object} student - Student row
 * @returns {string} Role label
 */
function roleLabel(student) {
  if (!student.is_lead) return 'Member';
  return student.lead_type ? `Lead — ${student.lead_type}` : 'Lead';
}

/**
 * Shape student rows and hour entries into the printable report
 *
 * Every entry passed in is counted. `year` only labels the result -- narrowing
 * to a school year is the caller's job (fetchReport does it in SQL).
 * @param {object} input - Report inputs
 * @param {Array} input.students - Student rows (student_id, name, is_lead, lead_type, is_former)
 * @param {Array} input.entries - Hour rows, already filtered to the range being reported
 * @param {string} [input.year] - School year label for the output, or 'all'
 * @param {boolean} [input.includeZero] - Keep students with no hours in range
 * @param {Date} [input.generatedAt] - Report timestamp
 * @returns {object} Report payload
 */
function summarizeHours({ students = [], entries = [], year = ALL_YEARS, includeZero = false, generatedAt = new Date() }) {
  const perStudent = new Map();

  students.forEach(student => {
    perStudent.set(student.student_id, {
      studentId: student.student_id,
      name: student.name,
      status: student.is_former ? 'Former' : 'Active',
      role: roleLabel(student),
      isLead: Boolean(student.is_lead),
      leadType: student.lead_type || '',
      totalMinutes: 0,
      entries: 0,
      minutesByType: emptyTypeTotals(),
      dates: new Set(),
      schoolYears: new Set(),
      activities: new Set()
    });
  });

  // Hours can outlive a student record (a roster row deleted, an import typo) or
  // belong to someone filtered out of this report. Those have no certificate to
  // print, so they stay out of the totals -- but they are counted and reported
  // so the missing time is visible rather than silently dropped.
  const unmatched = { entries: 0, minutes: 0 };

  entries.forEach(entry => {
    const student = perStudent.get(entry.student_id);
    if (!student) {
      unmatched.entries += 1;
      unmatched.minutes += minutesBetween(entry.time_in, entry.time_out);
      return;
    }

    const minutes = minutesBetween(entry.time_in, entry.time_out);
    const type = normalizeHourType(entry.hour_type);
    student.totalMinutes += minutes;
    student.entries += 1;
    student.minutesByType[type] += minutes;
    if (entry.date) {
      student.dates.add(entry.date);
      const label = schoolYear.labelForDate(entry.date);
      if (label) student.schoolYears.add(label);
    }
    const activity = String(entry.item || '').trim();
    if (activity) student.activities.add(activity);
  });

  const kept = [...perStudent.values()]
    .filter(student => includeZero || student.entries > 0);

  const rows = kept
    .map(student => {
      const dates = [...student.dates].sort();
      return {
        studentId: student.studentId,
        name: student.name,
        status: student.status,
        role: student.role,
        isLead: student.isLead,
        leadType: student.leadType,
        totalHours: decimalHours(student.totalMinutes),
        totalFormatted: formatMinutes(student.totalMinutes),
        totalMinutes: student.totalMinutes,
        entries: student.entries,
        daysServed: dates.length,
        firstDate: dates[0] || '',
        lastDate: dates[dates.length - 1] || '',
        schoolYears: [...student.schoolYears].sort().reverse(),
        byType: describeTypeTotals(student.minutesByType),
        activities: [...student.activities].sort()
      };
    })
    .sort((a, b) => b.totalMinutes - a.totalMinutes || a.name.localeCompare(b.name))
    .map((student, index) => ({ rank: index + 1, ...student }));

  // Totals accumulate raw minutes rather than the rounded per-student hours, so
  // a class total never drifts from the sum of the entries behind it.
  const classMinutesByType = emptyTypeTotals();
  let classMinutes = 0;
  let classEntries = 0;
  kept.forEach(student => {
    classMinutes += student.totalMinutes;
    classEntries += student.entries;
    HOUR_TYPES.forEach(type => {
      classMinutesByType[type.value] += student.minutesByType[type.value];
    });
  });

  const range = year === ALL_YEARS ? null : schoolYear.rangeForLabel(year);

  return {
    year,
    yearLabel: year === ALL_YEARS ? 'All Years' : year,
    range,
    generatedAt: generatedAt.toISOString(),
    totals: {
      students: rows.length,
      hours: decimalHours(classMinutes),
      hoursFormatted: formatMinutes(classMinutes),
      entries: classEntries,
      averageHours: rows.length ? decimalHours(classMinutes / rows.length) : 0,
      byType: describeTypeTotals(classMinutesByType)
    },
    unmatched: {
      entries: unmatched.entries,
      hours: decimalHours(unmatched.minutes),
      formatted: formatMinutes(unmatched.minutes)
    },
    students: rows
  };
}

/**
 * One row per student — the shape to mail-merge onto certificates
 * @param {object} report - Report from summarizeHours
 * @returns {string} CSV text
 */
function summaryCSV(report) {
  const typeHeaders = HOUR_TYPES.map(type => `${type.label} Hours`);
  const headers = [
    'Rank', 'Name', 'Student ID', 'Status', 'Role', 'School Year',
    'Total Hours', 'Total Time', 'Entries', 'Days Served',
    'First Date', 'Last Date', ...typeHeaders
  ];

  const rows = report.students.map(student => [
    student.rank,
    student.name,
    student.studentId,
    student.status,
    student.role,
    report.year === ALL_YEARS ? student.schoolYears.join('; ') : report.yearLabel,
    student.totalHours.toFixed(2),
    student.totalFormatted,
    student.entries,
    student.daysServed,
    student.firstDate,
    student.lastDate,
    ...student.byType.map(type => type.hours.toFixed(2))
  ]);

  return toCSV(headers, rows);
}

/**
 * One row per logged entry — the shape for service verification forms
 * @param {object} report - Report from summarizeHours
 * @param {Array} entries - The same hour rows the report was built from
 * @returns {string} CSV text
 */
function detailCSV(report, entries) {
  const byId = new Map(report.students.map(student => [student.studentId, student]));
  const headers = [
    'Name', 'Student ID', 'Status', 'Role', 'School Year',
    'Date', 'Time In', 'Time Out', 'Hours', 'Type', 'Activity'
  ];

  const rows = (entries || [])
    .filter(entry => byId.has(entry.student_id))
    .sort((a, b) => {
      const left = byId.get(a.student_id);
      const right = byId.get(b.student_id);
      return left.name.localeCompare(right.name)
        || String(a.date).localeCompare(String(b.date))
        || String(a.time_in).localeCompare(String(b.time_in));
    })
    .map(entry => {
      const student = byId.get(entry.student_id);
      const minutes = minutesBetween(entry.time_in, entry.time_out);
      return [
        student.name,
        student.studentId,
        student.status,
        student.role,
        schoolYear.labelForDate(entry.date) || '',
        entry.date,
        entry.time_in,
        entry.time_out,
        decimalHours(minutes).toFixed(2),
        hourTypeLabel(normalizeHourType(entry.hour_type)),
        entry.item || ''
      ];
    });

  return toCSV(headers, rows);
}

/**
 * The entries behind a report, newest first, for listing on screen
 *
 * Same rows and rules as detailCSV, shaped for a page rather than a spreadsheet.
 * @param {object} report - Report from summarizeHours
 * @param {Array} entries - The same hour rows the report was built from
 * @returns {Array} One object per entry
 */
function entryList(report, entries) {
  const ids = new Set(report.students.map(student => student.studentId));
  return (entries || [])
    .filter(entry => ids.has(entry.student_id))
    .map(entry => {
      const minutes = minutesBetween(entry.time_in, entry.time_out);
      const type = normalizeHourType(entry.hour_type);
      return {
        studentId: entry.student_id,
        date: entry.date,
        timeIn: entry.time_in,
        timeOut: entry.time_out,
        hours: decimalHours(minutes),
        formatted: formatMinutes(minutes),
        type,
        typeLabel: hourTypeLabel(type),
        activity: entry.item || ''
      };
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date))
      || String(b.timeIn).localeCompare(String(a.timeIn)));
}

/**
 * Pick which school year to report on when the caller did not name one
 *
 * Prefers the year in progress, but falls back to the newest year that actually
 * has hours so an empty report is never the default answer.
 * @param {string[]} availableYears - Year labels present in the data, newest first
 * @param {Date} [now] - Reference date
 * @returns {string} School year label
 */
function defaultYear(availableYears, now = new Date()) {
  const current = schoolYear.currentLabel(now);
  if (availableYears.includes(current)) return current;
  return availableYears[0] || current;
}

/**
 * Load the students and hour entries a report covers
 *
 * Shared by every hours report so they all resolve the school year, the hour
 * type fallback and the former-student rule the same way.
 * @param {object} [options] - Query options
 * @param {string} [options.year] - School year label such as "2025-26", or 'all'; omit to auto-pick
 * @param {boolean} [options.includeFormer] - Include students marked former
 * @param {string} [options.hourType] - Restrict to a single hour category
 * @param {string} [options.studentId] - Restrict to one student
 * @returns {Promise<{year: string, range: object|null, entries: Array, students: Array, availableYears: string[]}>} Rows and the resolved year
 */
async function loadHoursData({ year, includeFormer = true, hourType = '', studentId = '' } = {}) {
  const dateRows = await all('SELECT DISTINCT date FROM hours');
  const availableYears = schoolYear.labelsForDates(dateRows.map(row => row.date));

  const asked = year === undefined || year === null || String(year).trim() === ''
    ? defaultYear(availableYears)
    : String(year).trim();
  const requestedYear = asked === ALL_YEARS ? ALL_YEARS : asked;
  const range = requestedYear === ALL_YEARS ? null : schoolYear.rangeForLabel(requestedYear);
  if (requestedYear !== ALL_YEARS && !range) {
    throw Object.assign(new Error(`Unknown school year "${year}". Expected a label like 2025-26 or "all".`), { status: 400 });
  }

  const conditions = [];
  const params = [];
  if (range) {
    conditions.push('h.date >= ?', 'h.date <= ?');
    params.push(range.startDate, range.endDate);
  }
  if (hourType) {
    const normalized = normalizeHourType(hourType);
    // 'other' is the column default, so rows written before the column existed
    // (NULL or empty) belong with it.
    conditions.push(normalized === 'other'
      ? "(h.hour_type = ? OR h.hour_type IS NULL OR h.hour_type = '')"
      : 'h.hour_type = ?');
    params.push(normalized);
  }
  if (studentId) {
    conditions.push('h.student_id = ?');
    params.push(studentId);
  }

  const studentConditions = [];
  if (!includeFormer) studentConditions.push('COALESCE(is_former, 0) = 0');
  if (studentId) studentConditions.push('student_id = ?');

  const [entries, students] = await Promise.all([
    all(
      `SELECT h.student_id, h.date, h.time_in, h.time_out, h.hour_type, h.item
       FROM hours h
       ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
       ORDER BY h.date, h.time_in`,
      params
    ),
    all(
      `SELECT student_id, name, is_lead, lead_type, COALESCE(is_former, 0) AS is_former
       FROM students
       ${studentConditions.length ? `WHERE ${studentConditions.join(' AND ')}` : ''}
       ORDER BY name`,
      studentId ? [studentId] : []
    )
  ]);

  return { year: requestedYear, range, entries, students, availableYears };
}

/**
 * Build the per-student report straight from the database
 * @param {object} [options] - Query options, as loadHoursData, plus:
 * @param {boolean} [options.includeZero] - Include students with no hours in range
 * @returns {Promise<{report: object, entries: Array, availableYears: string[]}>} Report and the rows behind it
 */
async function fetchReport({ year, includeFormer = true, includeZero = false, hourType = '', studentId = '' } = {}) {
  const data = await loadHoursData({ year, includeFormer, hourType, studentId });
  const report = summarizeHours({
    students: data.students,
    entries: data.entries,
    year: data.year,
    includeZero
  });

  return { report, entries: data.entries, availableYears: data.availableYears };
}

module.exports = {
  ALL_YEARS,
  defaultYear,
  loadHoursData,
  minutesBetween,
  formatMinutes,
  decimalHours,
  roleLabel,
  summarizeHours,
  summaryCSV,
  detailCSV,
  entryList,
  fetchReport
};
