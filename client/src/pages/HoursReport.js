import React, { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { StudentTable, StudentCards, GroupTable, GroupCards } from '../components/report';
import { formatDate } from '../utils/formatters';

const ALL_YEARS = 'all';

// 'year' reads the per-student report; every other value asks the server to cut
// the same hours into certificate-sized blocks.
const WHOLE_YEAR = 'year';

/**
 * Printable hours report for certificates and service forms.
 *
 * The dashboard leaderboard shows only active students, has no year dimension,
 * and totals a whole year at once — so it can neither show a past year nor
 * recognize a week of work while it is still fresh. This page does both: any
 * school year still in the database, either as one line per student or split
 * into the stretches worth their own certificate.
 */
function HoursReport() {
  const [data, setData] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // What the report covers
  const [year, setYear] = useState('');
  const [hourType, setHourType] = useState('');
  const [includeFormer, setIncludeFormer] = useState(true);
  const [includeZero, setIncludeZero] = useState(false);

  // How the hours are cut into certificates
  const [grouping, setGrouping] = useState(WHOLE_YEAR);
  const [maxGapDays, setMaxGapDays] = useState(3);
  const [minHours, setMinHours] = useState(0);
  const [minDays, setMinDays] = useState(0);
  const [sort, setSort] = useState('recent');

  const [layout, setLayout] = useState('table');

  const grouped = grouping !== WHOLE_YEAR;

  const buildQuery = useCallback((extra = {}) => {
    const params = new URLSearchParams();
    if (year) params.set('year', year);
    if (hourType) params.set('hourType', hourType);
    if (!includeFormer) params.set('includeFormer', '0');

    if (grouped) {
      params.set('mode', grouping);
      params.set('sort', sort);
      if (grouping === 'run') params.set('maxGapDays', String(maxGapDays));
      if (minHours > 0) params.set('minHours', String(minHours));
      if (minDays > 0) params.set('minDays', String(minDays));
    } else if (includeZero) {
      params.set('includeZero', '1');
    }

    Object.entries(extra).forEach(([key, value]) => params.set(key, value));
    return params.toString();
  }, [year, hourType, includeFormer, includeZero, grouped, grouping, sort, maxGapDays, minHours, minDays]);

  const endpoint = grouped ? '/api/hours/groups' : '/api/hours/report';

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${endpoint}?${buildQuery()}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load report');
      }
      // Tag the payload with the shape it is, so a render that lands between a
      // control change and this fetch resolving reads the fields that exist.
      setData({ ...payload, kind: grouped ? 'groups' : 'report' });
      setAvailableYears(payload.availableYears || []);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [endpoint, buildQuery, grouped]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const downloadCSV = async (extra = {}) => {
    setError('');
    try {
      const response = await fetch(`${endpoint}?${buildQuery({ format: 'csv', ...extra })}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to export CSV');
      }

      const disposition = response.headers.get('content-disposition') || '';
      const match = /filename="?([^";]+)"?/.exec(disposition);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = match ? match[1] : 'leadership-hours.csv';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const hourTypes = data?.hourTypes || [];
  const groupModes = data?.groupModes || [];
  const activeMode = groupModes.find(mode => mode.value === grouping);

  // An empty `year` means "let the server pick" — the year in progress, or the
  // newest one with hours. Show whichever it chose rather than a blank select.
  const selectedYear = year || data?.year || '';
  const yearOptions = selectedYear && selectedYear !== ALL_YEARS && !availableYears.includes(selectedYear)
    ? [selectedYear, ...availableYears]
    : availableYears;

  const showingGroups = data?.kind === 'groups';
  // The header describes the sheet below it, so it reads the mode the data was
  // built with, not the one the control is currently set to.
  const sheetMode = showingGroups ? groupModes.find(mode => mode.value === data.mode) : null;
  const rows = showingGroups ? data?.groups : data?.students;
  const hasRows = rows && rows.length > 0;

  return (
    <div>
      <Navbar />
      <div className="report-layout">
        <div className="no-print">
          <h1 className="page-title">Hours Report</h1>
          <p className="report-intro">
            Every field per student for certificates and service forms, for any school year
            still in the database — including years the dashboard leaderboard hides. Split the
            hours into shorter stretches to hand out a certificate while the work is still fresh.
          </p>

          <div className="card report-controls">
            <div className="report-control">
              <label htmlFor="report-year">School year</label>
              <select id="report-year" value={selectedYear} onChange={(e) => setYear(e.target.value)}>
                {yearOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
                <option value={ALL_YEARS}>All years</option>
              </select>
            </div>

            <div className="report-control">
              <label htmlFor="report-grouping">Certificate per</label>
              <select id="report-grouping" value={grouping} onChange={(e) => setGrouping(e.target.value)}>
                <option value={WHOLE_YEAR}>Student (whole period)</option>
                {groupModes.map(mode => (
                  <option key={mode.value} value={mode.value}>{mode.label}</option>
                ))}
              </select>
            </div>

            <div className="report-control">
              <label htmlFor="report-type">Hour type</label>
              <select id="report-type" value={hourType} onChange={(e) => setHourType(e.target.value)}>
                <option value="">All types</option>
                {hourTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="report-control">
              <label htmlFor="report-layout">Layout</label>
              <select id="report-layout" value={layout} onChange={(e) => setLayout(e.target.value)}>
                <option value="table">Table</option>
                <option value="cards">Certificate cards</option>
              </select>
            </div>

            {grouping === 'run' && (
              <div className="report-control">
                <label htmlFor="report-gap">Break a run after</label>
                <select id="report-gap" value={maxGapDays} onChange={(e) => setMaxGapDays(Number(e.target.value))}>
                  <option value={1}>1 day off (strictly consecutive)</option>
                  <option value={3}>3 days off (keeps a weekend together)</option>
                  <option value={7}>7 days off (keeps a week together)</option>
                  <option value={14}>14 days off</option>
                </select>
              </div>
            )}

            {grouped && (
              <>
                <div className="report-control">
                  <label htmlFor="report-min-hours">Min hours</label>
                  <input
                    id="report-min-hours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={minHours}
                    onChange={(e) => setMinHours(Number(e.target.value) || 0)}
                  />
                </div>

                <div className="report-control">
                  <label htmlFor="report-min-days">Min days</label>
                  <input
                    id="report-min-days"
                    type="number"
                    min="0"
                    step="1"
                    value={minDays}
                    onChange={(e) => setMinDays(Number(e.target.value) || 0)}
                  />
                </div>

                <div className="report-control">
                  <label htmlFor="report-sort">Order</label>
                  <select id="report-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="recent">Most recently finished</option>
                    <option value="student">Student name</option>
                    <option value="hours">Most hours</option>
                  </select>
                </div>
              </>
            )}

            <label className="report-checkbox">
              <input
                type="checkbox"
                checked={includeFormer}
                onChange={(e) => setIncludeFormer(e.target.checked)}
              />
              Include former students
            </label>

            {!grouped && (
              <label className="report-checkbox">
                <input
                  type="checkbox"
                  checked={includeZero}
                  onChange={(e) => setIncludeZero(e.target.checked)}
                />
                Include students with no hours
              </label>
            )}

            <div className="report-actions">
              <button className="btn btn-small" onClick={() => window.print()}>
                Print
              </button>
              {grouped ? (
                <button className="btn btn-small" onClick={() => downloadCSV()}>
                  CSV — one row per certificate
                </button>
              ) : (
                <>
                  <button className="btn btn-small" onClick={() => downloadCSV()}>
                    CSV — per student
                  </button>
                  <button className="btn btn-small" onClick={() => downloadCSV({ detail: '1' })}>
                    CSV — every entry
                  </button>
                </>
              )}
            </div>
          </div>

          {activeMode && <p className="report-hint">{activeMode.description}.</p>}
          {error && <div className="error-message">{error}</div>}
        </div>

        {loading && <div className="card no-print">Loading report…</div>}

        {!loading && data && (
          <div className="report-sheet">
            <header className="report-header">
              <h2>Hawkins Leadership — Service Hours</h2>
              <p className="report-header-meta">
                {data.yearLabel}
                {data.range && ` · ${formatDate(data.range.startDate)} – ${formatDate(data.range.endDate)}`}
                {hourType && ` · ${hourTypes.find(t => t.value === hourType)?.label || hourType} only`}
                {sheetMode && ` · ${sheetMode.label}`}
              </p>
              <p className="report-header-meta">
                {showingGroups
                  ? `${data.totals.groups} certificates · ${data.totals.students} students · ${data.totals.hoursFormatted} total · ${data.totals.entries} entries`
                  : `${data.totals.students} students · ${data.totals.hoursFormatted} total · ${data.totals.averageHours.toFixed(2)} hrs average · ${data.totals.entries} entries`}
              </p>
            </header>

            {showingGroups && data.belowThreshold.groups > 0 && (
              <p className="report-note no-print">
                {data.belowThreshold.groups} shorter {data.belowThreshold.groups === 1 ? 'block' : 'blocks'}
                {' '}({data.belowThreshold.formatted}) fell below the minimums and are not shown.
              </p>
            )}

            {data.unmatched.entries > 0 && (
              <p className="report-note no-print">
                {data.unmatched.entries} {data.unmatched.entries === 1 ? 'entry' : 'entries'}
                {' '}({data.unmatched.formatted}) in this range
                {' '}{data.unmatched.entries === 1 ? 'belongs' : 'belong'} to someone not listed
                here — removed from the roster, or filtered out by the options above.
              </p>
            )}

            {!hasRows && <p className="report-note">No hours recorded for this selection.</p>}

            {hasRows && layout === 'table' && (
              showingGroups
                ? <GroupTable groups={data.groups} />
                : <StudentTable students={data.students} hourTypes={hourTypes} />
            )}

            {hasRows && layout === 'cards' && (
              showingGroups
                ? <GroupCards groups={data.groups} />
                : <StudentCards
                    students={data.students}
                    yearLabel={data.yearLabel}
                    allYears={data.year === ALL_YEARS}
                  />
            )}

            <footer className="report-footer">
              Generated {formatDate(data.generatedAt.slice(0, 10))}
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}

export default HoursReport;
