import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { formatDateWithWeekday, formatTime, calculateHours } from '../utils/formatters';

function ViewAllHours({ user, onLogout }) {
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [resolvingIndex, setResolvingIndex] = useState(null);

  useEffect(() => {
    fetchAllHours();
  }, []);

  const fetchAllHours = async () => {
    try {
      const response = await fetch('/api/hours/all');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch hours');
      }

      setHours(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUploadResult(null);
    setConflicts([]);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/hours/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload CSV');
      }

      setUploadResult(data);

      if (data.conflicts && data.conflicts.length > 0) {
        setConflicts(data.conflicts);
      }

      if (data.added > 0) {
        let msg = `Successfully imported ${data.added} hour entries!`;
        if (data.skipped > 0) {
          msg += ` (${data.skipped} exact duplicates skipped)`;
        }
        setSuccess(msg);
        fetchAllHours();
      } else if (data.skipped > 0 && data.conflicts.length === 0 && data.errors.length === 0) {
        setSuccess(`All ${data.skipped} entries were already in the system (exact duplicates skipped).`);
      } else if (data.conflicts.length === 0 && data.errors.length === 0) {
        setError('No valid entries found in the CSV file.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleResolveConflict = async (conflict, action) => {
    const index = conflicts.indexOf(conflict);
    setResolvingIndex(index);

    try {
      const response = await fetch('/api/hours/resolve-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existingId: conflict.existing.id,
          action,
          newData: {
            studentId: conflict.studentId,
            date: conflict.date,
            timeIn: conflict.new.timeIn,
            timeOut: conflict.new.timeOut,
            item: conflict.new.item
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resolve conflict');
      }

      // Remove this conflict from the list
      setConflicts(prev => prev.filter((_, i) => i !== index));

      // Refresh the hours list
      fetchAllHours();
    } catch (err) {
      setError(err.message);
    } finally {
      setResolvingIndex(null);
    }
  };

  const downloadTemplate = () => {
    const headers = 'student_id,date,time_in,time_out,item';
    const example1 = '12345,2024-12-11,09:00,12:00,Event Setup';
    const example2 = '12345,12/11/2024,1:00 PM,4:30 PM,Concession Stand';
    const csvContent = [headers, example1, example2].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hours-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStudentSummary = () => {
    const summary = {};
    hours.forEach((entry) => {
      if (!summary[entry.student_id]) {
        summary[entry.student_id] = {
          name: entry.name,
          totalMinutes: 0,
          entries: 0
        };
      }
      const [inHours, inMinutes] = entry.time_in.split(':').map(Number);
      const [outHours, outMinutes] = entry.time_out.split(':').map(Number);
      const inTotal = inHours * 60 + inMinutes;
      const outTotal = outHours * 60 + outMinutes;
      summary[entry.student_id].totalMinutes += outTotal - inTotal;
      summary[entry.student_id].entries++;
    });
    return Object.entries(summary).map(([studentId, data]) => ({
      studentId,
      ...data,
      totalFormatted: `${Math.floor(data.totalMinutes / 60)}h ${data.totalMinutes % 60}m`
    })).sort((a, b) => b.totalMinutes - a.totalMinutes);
  };

  if (loading) {
    return (
      <div>
        <Navbar user={user} onLogout={onLogout} />
        <div className="container">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const studentSummary = getStudentSummary();

  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      <div className="container">
        <h1 className="page-title">All Hours</h1>

        {error && <div className="card"><div className="error-message">{error}</div></div>}
        {success && <div className="card"><div className="success-message">{success}</div></div>}

        {/* Conflict Resolution UI */}
        {conflicts.length > 0 && (
          <div className="card" style={{ borderColor: '#eab308' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#eab308', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span> Resolve Conflicts ({conflicts.length})
            </h2>
            <p style={{ marginBottom: '16px', color: '#4a7c59', fontSize: '14px' }}>
              These entries have different times for the same student and date. Choose which to keep.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {conflicts.map((conflict, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px',
                    background: '#1a1a1a',
                    borderRadius: '8px',
                    border: '1px solid #333'
                  }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <strong style={{ color: '#22c55e' }}>{conflict.studentName}</strong>
                    <span style={{ color: '#4ade80', marginLeft: '8px' }}>({conflict.studentId})</span>
                    <span style={{ color: '#888', marginLeft: '12px' }}>{formatDateWithWeekday(conflict.date)}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    {/* Existing Entry */}
                    <div style={{
                      padding: '12px',
                      background: '#0a0a0a',
                      borderRadius: '6px',
                      border: '1px solid #333'
                    }}>
                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Current Entry
                      </div>
                      <div style={{ color: '#fff', fontWeight: 600 }}>
                        {formatTime(conflict.existing.timeIn)} - {formatTime(conflict.existing.timeOut)}
                      </div>
                      <div style={{ color: '#22c55e', fontSize: '14px' }}>
                        {calculateHours(conflict.existing.timeIn, conflict.existing.timeOut)}
                      </div>
                      {conflict.existing.item && (
                        <div style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>
                          {conflict.existing.item}
                        </div>
                      )}
                    </div>

                    {/* New Entry */}
                    <div style={{
                      padding: '12px',
                      background: '#0a0a0a',
                      borderRadius: '6px',
                      border: '1px solid #eab308'
                    }}>
                      <div style={{ fontSize: '12px', color: '#eab308', marginBottom: '8px', textTransform: 'uppercase' }}>
                        From CSV (Row {conflict.rowNum})
                      </div>
                      <div style={{ color: '#fff', fontWeight: 600 }}>
                        {formatTime(conflict.new.timeIn)} - {formatTime(conflict.new.timeOut)}
                      </div>
                      <div style={{ color: '#22c55e', fontSize: '14px' }}>
                        {calculateHours(conflict.new.timeIn, conflict.new.timeOut)}
                      </div>
                      {conflict.new.item && (
                        <div style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>
                          {conflict.new.item}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-small"
                      onClick={() => handleResolveConflict(conflict, 'keep-existing')}
                      disabled={resolvingIndex === index}
                      style={{ background: '#333' }}
                    >
                      Keep Current
                    </button>
                    <button
                      className="btn btn-small"
                      onClick={() => handleResolveConflict(conflict, 'use-new')}
                      disabled={resolvingIndex === index}
                      style={{ background: '#eab308', color: '#000' }}
                    >
                      Use CSV Entry
                    </button>
                    <button
                      className="btn btn-small"
                      onClick={() => handleResolveConflict(conflict, 'keep-both')}
                      disabled={resolvingIndex === index}
                      style={{ background: '#22c55e', color: '#000' }}
                    >
                      Keep Both
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CSV Import */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>Import Hours from CSV</h2>
          <p style={{ marginBottom: '12px', color: '#4ade80', fontSize: '14px' }}>
            CSV columns: <code style={{ background: '#1a1a1a', padding: '2px 6px', borderRadius: '4px' }}>student_id, date, time_in, time_out, item</code>
          </p>
          <p style={{ marginBottom: '16px', color: '#4a7c59', fontSize: '13px' }}>
            Exact duplicates are automatically skipped. Entries with different times for the same date will prompt for resolution.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="input"
              style={{ padding: '8px', flex: 1, minWidth: '200px' }}
              disabled={uploading}
            />
            <button
              className="btn btn-small"
              onClick={downloadTemplate}
              style={{ background: '#333' }}
            >
              Download Template
            </button>
          </div>
          {uploading && (
            <p style={{ marginTop: '12px', color: '#22c55e' }}>Uploading...</p>
          )}
          {uploadResult && uploadResult.errors && uploadResult.errors.length > 0 && (
            <div style={{ marginTop: '12px', padding: '12px', background: '#1a1a1a', border: '1px solid #ef4444', borderRadius: '8px' }}>
              <p style={{ fontWeight: 500, marginBottom: '8px', color: '#ef4444' }}>
                Errors ({uploadResult.errors.length}):
              </p>
              <ul style={{ marginLeft: '20px', fontSize: '13px', color: '#ef4444', maxHeight: '150px', overflowY: 'auto' }}>
                {uploadResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Summary by Student */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>Summary by Student</h2>
          {studentSummary.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#4ade80' }}>No hours logged yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Student ID</th>
                    <th>Total Hours</th>
                    <th>Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {studentSummary.map((student) => (
                    <tr key={student.studentId}>
                      <td>{student.name}</td>
                      <td>{student.studentId}</td>
                      <td style={{ fontWeight: 600, color: '#22c55e' }}>{student.totalFormatted}</td>
                      <td>{student.entries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* All Entries */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>All Entries ({hours.length})</h2>
          {hours.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#4ade80' }}>No hours logged yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Date</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {hours.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <div>{entry.name}</div>
                        <div style={{ fontSize: '12px', color: '#4ade80' }}>{entry.student_id}</div>
                      </td>
                      <td>{formatDateWithWeekday(entry.date)}</td>
                      <td>{formatTime(entry.time_in)}</td>
                      <td>{formatTime(entry.time_out)}</td>
                      <td>{calculateHours(entry.time_in, entry.time_out)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ViewAllHours;
