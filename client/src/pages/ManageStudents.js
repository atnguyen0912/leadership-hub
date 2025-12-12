import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';

function ManageStudents({ user, onLogout }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add student form
  const [newStudentId, setNewStudentId] = useState('');
  const [newName, setNewName] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // CSV upload
  const [uploadResult, setUploadResult] = useState(null);

  // Lead type loading state
  const [leadLoading, setLeadLoading] = useState(null);

  // CSV save/download state
  const [savingCSV, setSavingCSV] = useState(false);

  // Student ID validation: 6 digits + M/F/X + 3 digits (e.g., 123456M789)
  const STUDENT_ID_REGEX = /^\d{6}[MFX]\d{3}$/;

  const validateStudentId = (id) => {
    return STUDENT_ID_REGEX.test(id);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch students');
      }

      setStudents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate student ID format
    if (!validateStudentId(newStudentId)) {
      setError('Invalid Student ID format. Must be 6 digits + M/F/X + 3 digits (e.g., 123456M789)');
      return;
    }

    setAddLoading(true);

    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: newStudentId, name: newName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add student');
      }

      setSuccess('Student added successfully!');
      setNewStudentId('');
      setNewName('');
      fetchStudents();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to remove this student? This will also delete all their logged hours.')) {
      return;
    }

    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove student');
      }

      setSuccess('Student removed successfully!');
      fetchStudents();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/students/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload CSV');
      }

      setUploadResult(data);
      if (data.added > 0) {
        setSuccess(`Successfully added ${data.added} student(s)!`);
      }
      fetchStudents();
    } catch (err) {
      setError(err.message);
    }

    // Reset file input
    e.target.value = '';
  };

  const handleSetLeadType = async (studentId, leadType) => {
    setLeadLoading(studentId);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/students/${studentId}/set-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update lead status');
      }

      const typeLabel = leadType === 'events' ? 'Events Lead' :
                        leadType === 'concessions' ? 'Concessions Lead' : 'Regular Student';
      setSuccess(`Updated to ${typeLabel} successfully!`);
      fetchStudents();
    } catch (err) {
      setError(err.message);
    } finally {
      setLeadLoading(null);
    }
  };

  const getLeadTypeLabel = (student) => {
    if (!student.is_lead || !student.lead_type) return null;
    if (student.lead_type === 'events') return 'Events';
    if (student.lead_type === 'concessions') return 'Concessions';
    return student.lead_type;
  };

  const getLeadTypeColor = (leadType) => {
    if (leadType === 'events') return '#3b82f6';
    if (leadType === 'concessions') return '#22c55e';
    return '#666';
  };

  // Save students to CSV file on server
  const handleSaveToCSV = async () => {
    setSavingCSV(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/students/save-to-csv', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save CSV');
      }

      setSuccess(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCSV(false);
    }
  };

  // Download students as CSV file
  const handleDownloadCSV = () => {
    window.open('/api/students/csv', '_blank');
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

  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      <div className="container">
        <h1 className="page-title">Manage Students</h1>

        {error && <div className="card"><div className="error-message">{error}</div></div>}
        {success && <div className="card"><div className="success-message">{success}</div></div>}

        {/* Add Student Form */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>Add Student</h2>
          <form onSubmit={handleAddStudent}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="studentId">Student ID</label>
                <input
                  type="text"
                  id="studentId"
                  className="input"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value.toUpperCase())}
                  placeholder="e.g., 123456M789"
                  pattern="\d{6}[MFX]\d{3}"
                  maxLength={10}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  className="input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., John Smith"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={addLoading}>
                {addLoading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        </div>

        {/* CSV Upload */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>Upload CSV Roster</h2>
          <p style={{ marginBottom: '12px', color: '#4ade80', fontSize: '14px' }}>
            CSV file should have columns: student_id, name
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="input"
            style={{ padding: '8px' }}
          />
          {uploadResult && uploadResult.errors.length > 0 && (
            <div style={{ marginTop: '12px', padding: '12px', background: '#1a1a1a', border: '1px solid #eab308', borderRadius: '8px' }}>
              <p style={{ fontWeight: 500, marginBottom: '8px', color: '#eab308' }}>Warnings:</p>
              <ul style={{ marginLeft: '20px', fontSize: '14px', color: '#eab308' }}>
                {uploadResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Save/Export CSV */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>Export Students</h2>
          <p style={{ marginBottom: '12px', color: '#4ade80', fontSize: '14px' }}>
            Save students to CSV to persist data between deployments, or download for backup.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={handleSaveToCSV}
              disabled={savingCSV}
            >
              {savingCSV ? 'Saving...' : 'Save to Server CSV'}
            </button>
            <button
              className="btn"
              onClick={handleDownloadCSV}
              style={{ background: '#4a7c59' }}
            >
              Download CSV
            </button>
          </div>
        </div>

        {/* Students Table */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>All Students ({students.length})</h2>
          {students.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#4ade80' }}>No students registered yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th style={{ width: '180px' }}>Lead Role</th>
                    <th style={{ width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const leadLabel = getLeadTypeLabel(student);
                    return (
                      <tr key={student.student_id}>
                        <td>{student.student_id}</td>
                        <td>
                          {student.name}
                          {leadLabel && (
                            <span style={{
                              marginLeft: '8px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: getLeadTypeColor(student.lead_type),
                              color: '#fff'
                            }}>
                              {leadLabel}
                            </span>
                          )}
                        </td>
                        <td>
                          <select
                            className="input"
                            value={student.lead_type || ''}
                            onChange={(e) => handleSetLeadType(student.student_id, e.target.value || null)}
                            disabled={leadLoading === student.student_id}
                            style={{
                              padding: '6px 8px',
                              minHeight: '36px',
                              fontSize: '13px',
                              background: student.lead_type ? getLeadTypeColor(student.lead_type) + '20' : undefined,
                              borderColor: student.lead_type ? getLeadTypeColor(student.lead_type) : undefined
                            }}
                          >
                            <option value="">None</option>
                            <option value="events">Events Lead</option>
                            <option value="concessions">Concessions Lead</option>
                          </select>
                        </td>
                        <td>
                          <button
                            className="btn btn-danger btn-small"
                            onClick={() => handleDeleteStudent(student.student_id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManageStudents;
