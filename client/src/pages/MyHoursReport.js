import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts';
import { formatDate, formatDateWithWeekday, formatTime } from '../utils/formatters';
import { getHourTypeColor } from '../utils/hourTypes';

const ALL_YEARS = 'all';

/**
 * A student's own Hours Report: pick a school year, see the total, print it.
 *
 * Admins get the full report with certificate grouping and CSV exports; a
 * student only ever needs their own hours, so this keeps to one choice (the
 * year) and lays the answer out as a sheet they can print or save as a PDF
 * for a service form.
 */
function MyHoursReport() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError('');
      try {
        // The server scopes this to the signed-in student.
        const params = new URLSearchParams({ entries: '1' });
        if (year) params.set('year', year);
        const response = await fetch(`/api/hours/report?${params}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load your hours');
        }
        setData(payload);
        setAvailableYears(payload.availableYears || []);
      } catch (err) {
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [year]);

  // An empty `year` lets the server pick the current one; show what it chose.
  const selectedYear = year || data?.year || '';
  const yearOptions = selectedYear && selectedYear !== ALL_YEARS && !availableYears.includes(selectedYear)
    ? [selectedYear, ...availableYears]
    : availableYears;

  const me = data?.students?.[0];
  const entries = data?.entries || [];
  const types = me ? me.byType.filter(type => type.hours > 0) : [];
  const maxTypeHours = Math.max(...types.map(type => type.hours), 1);

  return (
    <div>
      <Navbar />
      <div className="report-layout">
        <div className="no-print">
          <h1 className="page-title">My Hours Report</h1>
          <p className="report-intro">
            Your service hours for a school year. Print it or save it as a PDF to attach to a service form.
          </p>

          <div className="card report-controls">
            <div className="report-control">
              <label htmlFor="my-report-year">School year</label>
              <select id="my-report-year" value={selectedYear} onChange={(e) => setYear(e.target.value)}>
                {yearOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
                <option value={ALL_YEARS}>All years</option>
              </select>
            </div>
            <div className="report-actions">
              <button className="btn btn-primary btn-small" onClick={() => window.print()} disabled={!me}>
                Print / Save as PDF
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>

        {loading && <div className="card no-print">Loading your hours…</div>}

        {!loading && data && (
          <div className="report-sheet">
            <header className="report-header">
              <h2>Hawkins Leadership — Service Hours</h2>
              <p className="report-header-meta">
                {me?.name || user?.name}
                {me && ` · ${me.role}`}
                {` · ${data.yearLabel}`}
              </p>
            </header>

            {!me && <p className="report-note">No hours recorded for {data.yearLabel}.</p>}

            {me && (
              <>
                <div className="my-hours-stats">
                  <div className="my-hours-stat my-hours-stat-main">
                    <span className="my-hours-stat-value">{me.totalFormatted}</span>
                    <span className="my-hours-stat-label">{me.totalHours.toFixed(2)} total hours</span>
                  </div>
                  <div className="my-hours-stat">
                    <span className="my-hours-stat-value">{me.daysServed}</span>
                    <span className="my-hours-stat-label">Days served</span>
                  </div>
                  <div className="my-hours-stat">
                    <span className="my-hours-stat-value">{me.entries}</span>
                    <span className="my-hours-stat-label">Entries</span>
                  </div>
                  <div className="my-hours-stat">
                    <span className="my-hours-stat-value my-hours-stat-period">
                      {formatDate(me.firstDate)} – {formatDate(me.lastDate)}
                    </span>
                    <span className="my-hours-stat-label">Service period</span>
                  </div>
                </div>

                <section className="my-hours-section">
                  <h3>By type</h3>
                  <ul className="my-hours-types">
                    {types.map(type => (
                      <li key={type.value}>
                        <span className="my-hours-type-name">{type.label}</span>
                        <span className="my-hours-type-bar">
                          <span
                            style={{
                              width: `${(type.hours / maxTypeHours) * 100}%`,
                              backgroundColor: getHourTypeColor(type.value)
                            }}
                          />
                        </span>
                        <span className="my-hours-type-value">{type.formatted}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="my-hours-section">
                  <h3>Every entry</h3>
                  <div className="report-table-wrap">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Type</th>
                          <th>Activity</th>
                          <th className="num">Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry, index) => (
                          <tr key={`${entry.date}-${entry.timeIn}-${index}`}>
                            <td>{formatDateWithWeekday(entry.date)}</td>
                            <td>{formatTime(entry.timeIn)} – {formatTime(entry.timeOut)}</td>
                            <td>{entry.typeLabel}</td>
                            <td>{entry.activity || '—'}</td>
                            <td className="num">{entry.formatted}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <p className="cert-signature">Verified by ______________________________ Date ______________</p>
              </>
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

export default MyHoursReport;
