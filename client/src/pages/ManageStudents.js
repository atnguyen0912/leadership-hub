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
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Add Student</h2>
          <form onSubmit={handleAddStudent}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="studentId">Student ID</label>
                <input
                  type="text"
                  id="studentId"
                  className="input"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  placeholder="e.g., 12345"
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
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Upload CSV Roster</h2>
          <p style={{ marginBottom: '12px', color: '#6b7280', fontSize: '14px' }}>
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
            <div style={{ marginTop: '12px', padding: '12px', background: '#fef3c7', borderRadius: '8px' }}>
              <p style={{ fontWeight: 500, marginBottom: '8px' }}>Warnings:</p>
              <ul style={{ marginLeft: '20px', fontSize: '14px' }}>
                {uploadResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Students Table */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>All Students ({students.length})</h2>
          {students.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>No students registered yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th style={{ width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.student_id}>
                      <td>{student.student_id}</td>
                      <td>{student.name}</td>
                      <td>
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => handleDeleteStudent(student.student_id)}
                        >
                          Remove
                        </button>
                      </td>
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

export default ManageStudents;
