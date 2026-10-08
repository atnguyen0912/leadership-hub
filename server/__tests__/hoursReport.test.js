const schoolYear = require('../utils/schoolYear');
const {
  minutesBetween,
  summarizeHours,
  summaryCSV,
  detailCSV,
  defaultYear
} = require('../utils/hoursReport');

const students = [
  { student_id: '1001', name: 'Avery Nguyen', is_lead: 1, lead_type: 'Spirit', is_former: 0 },
  { student_id: '1002', name: 'Bo Martinez', is_lead: 0, lead_type: null, is_former: 0 },
  { student_id: '2001', name: 'Dana Park', is_lead: 0, lead_type: null, is_former: 1 },
  { student_id: '3001', name: 'Fin Walsh', is_lead: 0, lead_type: null, is_former: 0 }
];

const entries = [
  { student_id: '1001', date: '2025-09-12', time_in: '15:00', time_out: '17:30', hour_type: 'poster_making', item: 'Homecoming posters' },
  { student_id: '1001', date: '2025-10-03', time_in: '16:00', time_out: '20:00', hour_type: 'concessions', item: 'Football' },
  { student_id: '1002', date: '2025-09-12', time_in: '15:00', time_out: '16:00', hour_type: null, item: '' },
  { student_id: '2001', date: '2024-09-20', time_in: '15:00', time_out: '18:00', hour_type: 'event_planning', item: 'Spirit week' },
  { student_id: '9999', date: '2025-10-03', time_in: '15:00', time_out: '18:00', hour_type: 'concessions', item: 'Off-roster' }
];

describe('schoolYear', () => {
  it('assigns August onward to the year that starts then', () => {
    expect(schoolYear.labelForDate('2025-08-01')).toBe('2025-26');
    expect(schoolYear.labelForDate('2025-09-12')).toBe('2025-26');
  });

  it('assigns January through July to the year that started the previous August', () => {
    expect(schoolYear.labelForDate('2026-01-05')).toBe('2025-26');
    expect(schoolYear.labelForDate('2026-07-31')).toBe('2025-26');
  });

  it('maps a label back to its date range', () => {
    expect(schoolYear.rangeForLabel('2025-26')).toEqual({
      startYear: 2025,
      startDate: '2025-08-01',
      endDate: '2026-07-31'
    });
  });

  it('rejects labels whose halves disagree', () => {
    expect(schoolYear.rangeForLabel('2025-30')).toBeNull();
    expect(schoolYear.rangeForLabel('spring')).toBeNull();
  });

  it('lists the years present in a set of dates, newest first', () => {
    expect(schoolYear.labelsForDates(['2025-01-05', '2024-09-01', '2025-10-10']))
      .toEqual(['2025-26', '2024-25']);
  });
});

describe('minutesBetween', () => {
  it('measures same-day spans', () => {
    expect(minutesBetween('15:00', '17:30')).toBe(150);
  });

  it('returns zero rather than a negative for unusable times', () => {
    expect(minutesBetween('17:00', '15:00')).toBe(0);
    expect(minutesBetween('', null)).toBe(0);
  });
});

describe('summarizeHours', () => {
  it('ranks students by hours and fills in certificate fields', () => {
    const report = summarizeHours({ students, entries, year: '2025-26' });

    // `year` is a label only — callers filter entries to the range (fetchReport
    // does it in SQL), so Dana's 2024-25 entry still counts here.
    expect(report.students.map(s => s.name)).toEqual(['Avery Nguyen', 'Dana Park', 'Bo Martinez']);

    const [top] = report.students;
    expect(top).toMatchObject({
      rank: 1,
      studentId: '1001',
      role: 'Lead — Spirit',
      status: 'Active',
      totalHours: 6.5,
      totalFormatted: '6h 30m',
      entries: 2,
      daysServed: 2,
      firstDate: '2025-09-12',
      lastDate: '2025-10-03'
    });
    expect(top.activities).toEqual(['Football', 'Homecoming posters']);
  });

  it('labels members and former students for printing', () => {
    const report = summarizeHours({ students, entries, year: '2025-26' });
    const byName = Object.fromEntries(report.students.map(s => [s.name, s]));

    expect(byName['Bo Martinez'].role).toBe('Member');
    expect(byName['Dana Park'].status).toBe('Former');
  });

  it('counts entries with no hour_type as Other', () => {
    const report = summarizeHours({ students, entries, year: '2025-26' });
    const bo = report.students.find(s => s.name === 'Bo Martinez');
    const other = bo.byType.find(t => t.value === 'other');

    expect(other.hours).toBe(1);
  });

  it('omits students with no hours unless asked', () => {
    const without = summarizeHours({ students, entries, year: '2025-26' });
    const with0 = summarizeHours({ students, entries, year: '2025-26', includeZero: true });

    expect(without.students.map(s => s.name)).not.toContain('Fin Walsh');
    expect(with0.students.map(s => s.name)).toContain('Fin Walsh');
    expect(with0.students.find(s => s.name === 'Fin Walsh').totalHours).toBe(0);
  });

  it('reports hours belonging to nobody in the report instead of dropping them', () => {
    const report = summarizeHours({ students, entries, year: '2025-26' });

    expect(report.unmatched).toEqual({ entries: 1, hours: 3, formatted: '3h 0m' });
  });

  it('totals match the sum of the students listed', () => {
    const report = summarizeHours({ students, entries, year: '2025-26' });
    const summed = report.students.reduce((total, s) => total + s.totalHours, 0);

    expect(report.totals.hours).toBeCloseTo(summed, 2);
    expect(report.totals.students).toBe(3);
    expect(report.totals.hoursFormatted).toBe('10h 30m');
  });

  it('records every school year a student logged in when reporting on all years', () => {
    const report = summarizeHours({
      students,
      entries: [
        ...entries,
        { student_id: '1001', date: '2025-04-18', time_in: '14:00', time_out: '16:00', hour_type: 'poster_making', item: 'Prom' }
      ],
      year: 'all'
    });

    expect(report.yearLabel).toBe('All Years');
    expect(report.range).toBeNull();
    expect(report.students.find(s => s.name === 'Avery Nguyen').schoolYears)
      .toEqual(['2025-26', '2024-25']);
  });
});

describe('CSV export', () => {
  it('writes one row per student with the printable fields', () => {
    const report = summarizeHours({ students, entries, year: '2025-26' });
    const lines = summaryCSV(report).split('\r\n');

    expect(lines[0]).toBe(
      'Rank,Name,Student ID,Status,Role,School Year,Total Hours,Total Time,Entries,Days Served,'
      + 'First Date,Last Date,Poster Making Hours,Event Planning Hours,Concessions Hours,Other Hours'
    );
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe('1,Avery Nguyen,1001,Active,Lead — Spirit,2025-26,6.50,6h 30m,2,2,2025-09-12,2025-10-03,2.50,0.00,4.00,0.00');
  });

  it('quotes fields containing commas or quotes', () => {
    const report = summarizeHours({
      students: [{ student_id: '1003', name: 'Casey O\'Brien, Jr.', is_lead: 0, is_former: 0 }],
      entries: [{ student_id: '1003', date: '2025-09-01', time_in: '09:00', time_out: '10:00', hour_type: 'other', item: 'Setup, teardown' }],
      year: '2025-26'
    });

    expect(summaryCSV(report)).toContain('"Casey O\'Brien, Jr."');
    expect(detailCSV(report, [
      { student_id: '1003', date: '2025-09-01', time_in: '09:00', time_out: '10:00', hour_type: 'other', item: 'Setup, teardown' }
    ])).toContain('"Setup, teardown"');
  });

  it('writes one row per entry, grouped by student then date', () => {
    const report = summarizeHours({ students, entries, year: '2025-26' });
    const lines = detailCSV(report, entries).split('\r\n');

    // Header + 4 entries; the off-roster entry has no student to attribute it to.
    expect(lines).toHaveLength(5);
    expect(lines[1]).toContain('Avery Nguyen,1001,Active,Lead — Spirit,2025-26,2025-09-12,15:00,17:30,2.50,Poster Making,Homecoming posters');
    expect(lines.join('\n')).not.toContain('Off-roster');
  });
});

describe('defaultYear', () => {
  it('prefers the year in progress when it has hours', () => {
    expect(defaultYear(['2026-27', '2025-26'], new Date('2026-10-08T12:00:00'))).toBe('2026-27');
  });

  it('falls back to the newest year with hours', () => {
    expect(defaultYear(['2025-26', '2024-25'], new Date('2026-10-08T12:00:00'))).toBe('2025-26');
  });

  it('falls back to the current year when there are no hours at all', () => {
    expect(defaultYear([], new Date('2026-10-08T12:00:00'))).toBe('2026-27');
  });
});
