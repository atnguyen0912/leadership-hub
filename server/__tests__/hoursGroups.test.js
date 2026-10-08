const {
  dayNumber,
  monthLabel,
  activityOf,
  groupHours,
  groupsCSV,
  GROUP_MODES,
  DEFAULT_MAX_GAP_DAYS
} = require('../utils/hoursGroups');

const students = [
  { student_id: '1001', name: 'Avery Nguyen', is_lead: 1, lead_type: 'Spirit', is_former: 0 },
  { student_id: '1002', name: 'Bo Martinez', is_lead: 0, lead_type: null, is_former: 0 }
];

const entry = (student_id, date, time_in, time_out, item, hour_type = 'poster_making') =>
  ({ student_id, date, time_in, time_out, item, hour_type });

// A Mon-Fri week of posters, then the following Monday, then a separate run a
// month later. Sep 13/14 2025 is a weekend.
const posterWeek = [
  entry('1001', '2025-09-08', '15:00', '17:00', 'Homecoming posters'),
  entry('1001', '2025-09-09', '15:00', '17:00', 'Homecoming posters'),
  entry('1001', '2025-09-12', '15:00', '17:00', 'Homecoming posters'),
  entry('1001', '2025-09-15', '15:00', '17:00', 'Homecoming posters'),
  entry('1001', '2025-10-20', '15:00', '17:00', 'Winter formal posters')
];

describe('dayNumber', () => {
  it('counts calendar days regardless of server timezone', () => {
    expect(dayNumber('2025-09-12') - dayNumber('2025-09-08')).toBe(4);
    expect(dayNumber('2026-01-01') - dayNumber('2025-12-31')).toBe(1);
  });

  it('rejects unusable dates', () => {
    expect(dayNumber('')).toBeNull();
    expect(dayNumber('Sept 8')).toBeNull();
  });
});

describe('activityOf', () => {
  it('matches the same activity across spacing and casing', () => {
    expect(activityOf({ item: 'Homecoming posters' }).key)
      .toBe(activityOf({ item: 'homecoming  POSTERS' }).key);
  });

  it('keeps the text as written for display', () => {
    expect(activityOf({ item: '  Homecoming posters ' }).label).toBe('Homecoming posters');
  });

  it('falls back to the hour type when no activity was typed', () => {
    expect(activityOf({ item: '', hour_type: 'concessions' }).label).toBe('Concessions');
    expect(activityOf({ item: null, hour_type: null }).label).toBe('Other');
  });
});

describe('monthLabel', () => {
  it('reads as a month and year', () => {
    expect(monthLabel('2025-09-08')).toBe('September 2025');
  });
});

describe('groupHours: run mode', () => {
  it('cuts a new certificate when the gap is longer than tolerated', () => {
    const { groups } = groupHours({ students, entries: posterWeek, mode: 'run', maxGapDays: 1, sort: 'student' });

    expect(groups.map(g => [g.activity, g.startDate, g.endDate])).toEqual([
      ['Homecoming posters', '2025-09-08', '2025-09-09'],
      ['Homecoming posters', '2025-09-12', '2025-09-12'],
      ['Homecoming posters', '2025-09-15', '2025-09-15'],
      ['Winter formal posters', '2025-10-20', '2025-10-20']
    ]);
  });

  it('keeps a stretch together across a weekend at the default gap', () => {
    const { groups, maxGapDays } = groupHours({ students, entries: posterWeek, mode: 'run', sort: 'student' });

    expect(maxGapDays).toBe(DEFAULT_MAX_GAP_DAYS);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      activity: 'Homecoming posters',
      startDate: '2025-09-08',
      endDate: '2025-09-15',
      days: 4,
      spanDays: 8,
      totalFormatted: '8h 0m'
    });
  });

  it('never merges different activities, however close the dates', () => {
    const sameWeek = [
      entry('1001', '2025-09-08', '15:00', '17:00', 'Homecoming posters'),
      entry('1001', '2025-09-09', '15:00', '17:00', 'Rally signs')
    ];
    const { groups } = groupHours({ students, entries: sameWeek, mode: 'run', sort: 'student' });

    expect(groups.map(g => g.activity).sort()).toEqual(['Homecoming posters', 'Rally signs']);
  });

  it('counts days served separately from the calendar span', () => {
    const { groups } = groupHours({ students, entries: posterWeek, mode: 'run', sort: 'student' });

    // Sep 8, 9, 12 and 15 — four days of work across an eight-day stretch.
    expect(groups[0].days).toBe(4);
    expect(groups[0].spanDays).toBe(8);
  });

  it('treats two entries on one day as a single day', () => {
    const twice = [
      entry('1001', '2026-03-20', '08:00', '12:00', '', 'other'),
      entry('1001', '2026-03-20', '13:00', '15:00', null, null)
    ];
    const { groups } = groupHours({ students, entries: twice, mode: 'run' });

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ activity: 'Other', days: 1, entries: 2, totalFormatted: '6h 0m' });
  });
});

describe('groupHours: other modes', () => {
  it('puts every date for one activity on a single certificate', () => {
    const { groups } = groupHours({ students, entries: posterWeek, mode: 'activity', sort: 'student' });

    const homecoming = groups.find(g => g.activity === 'Homecoming posters');
    expect(homecoming).toMatchObject({ startDate: '2025-09-08', endDate: '2025-09-15', days: 4 });
  });

  it('groups by hour category', () => {
    const mixed = [
      entry('1001', '2025-09-08', '15:00', '17:00', 'Homecoming posters', 'poster_making'),
      entry('1001', '2025-10-03', '16:00', '20:00', 'Football', 'concessions')
    ];
    const { groups } = groupHours({ students, entries: mixed, mode: 'type', sort: 'student' });

    expect(groups.map(g => g.activity).sort()).toEqual(['Concessions', 'Poster Making']);
  });

  it('groups by calendar month', () => {
    const { groups } = groupHours({ students, entries: posterWeek, mode: 'month', sort: 'student' });

    expect(groups.map(g => g.activity)).toEqual(['September 2025', 'October 2025']);
  });

  it('falls back to run mode for an unknown mode', () => {
    expect(groupHours({ students, entries: posterWeek, mode: 'nonsense' }).mode).toBe('run');
    expect(GROUP_MODES.map(m => m.value)).toContain('run');
  });
});

describe('groupHours: thresholds and reporting', () => {
  const short = [
    entry('1002', '2025-09-12', '15:00', '16:00', 'Homecoming posters'),
    entry('1002', '2025-11-07', '17:00', '21:00', 'Basketball concessions', 'concessions'),
    entry('1002', '2025-11-08', '09:00', '13:00', 'Basketball concessions', 'concessions')
  ];

  it('drops blocks below the hour or day floor and says what it dropped', () => {
    const result = groupHours({ students, entries: short, mode: 'run', minHours: 2, minDays: 2 });

    expect(result.groups.map(g => g.activity)).toEqual(['Basketball concessions']);
    expect(result.belowThreshold).toEqual({ groups: 1, hours: 1, formatted: '1h 0m' });
  });

  it('reports entries with no student rather than dropping them silently', () => {
    const result = groupHours({
      students,
      entries: [...short, entry('9999', '2025-09-12', '15:00', '18:00', 'Off-roster')],
      mode: 'run'
    });

    expect(result.unmatched).toEqual({ entries: 1, hours: 3, formatted: '3h 0m' });
  });

  it('totals only the blocks it kept', () => {
    const result = groupHours({ students, entries: short, mode: 'run', minHours: 2 });

    expect(result.totals).toMatchObject({ groups: 1, students: 1, hours: 8, hoursFormatted: '8h 0m', entries: 2 });
  });
});

describe('groupHours: sorting', () => {
  const entries = [...posterWeek, entry('1002', '2025-12-01', '15:00', '20:00', 'Winter concessions', 'concessions')];

  it('puts the most recently finished block first by default', () => {
    const { groups } = groupHours({ students, entries });
    expect(groups[0].activity).toBe('Winter concessions');
  });

  it('sorts by student then start date', () => {
    const { groups } = groupHours({ students, entries, sort: 'student' });
    expect(groups.map(g => g.name)).toEqual(['Avery Nguyen', 'Avery Nguyen', 'Bo Martinez']);
  });

  it('sorts by hours', () => {
    const { groups } = groupHours({ students, entries, sort: 'hours' });
    expect(groups[0].totalHours).toBeGreaterThanOrEqual(groups[1].totalHours);
  });
});

describe('groupsCSV', () => {
  it('writes one row per block with the certificate fields', () => {
    const result = groupHours({ students, entries: posterWeek, mode: 'run', sort: 'student' });
    const lines = groupsCSV(result).split('\r\n');

    expect(lines[0]).toBe(
      'Name,Student ID,Status,Role,Activity,School Year,Start Date,End Date,Days,'
      + 'Calendar Span,Entries,Total Hours,Total Time,Hour Types,Activities'
    );
    expect(lines[1]).toBe(
      'Avery Nguyen,1001,Active,Lead — Spirit,Homecoming posters,2025-26,'
      + '2025-09-08,2025-09-15,4,8,4,8.00,8h 0m,Poster Making,Homecoming posters'
    );
  });

  it('lists every spelling that was merged into one block', () => {
    const result = groupHours({
      students,
      entries: [
        entry('1001', '2025-09-08', '15:00', '17:00', 'Homecoming posters'),
        entry('1001', '2025-09-09', '15:00', '17:00', 'homecoming  Posters')
      ],
      mode: 'run'
    });

    // Semicolon-separated, so the field needs no quoting.
    expect(groupsCSV(result)).toContain('Homecoming posters; homecoming  Posters');
  });
});
