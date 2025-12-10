import React, { useState } from 'react';

function Login({ onLogin }) {
  const [loginType, setLoginType] = useState('student');
  const [studentId, setStudentId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '80px' }}>
      <div className="card">
        <h1 style={{ textAlign: 'center', marginBottom: '24px', color: '#4f46e5' }}>
          Leadership Hub
        </h1>

        <div style={{ display: 'flex', marginBottom: '24px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #d1d5db' }}>
          <button
            onClick={() => { setLoginType('student'); setError(''); }}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              cursor: 'pointer',
              background: loginType === 'student' ? '#4f46e5' : 'white',
              color: loginType === 'student' ? 'white' : '#374151',
              fontWeight: 500
            }}
          >
            Student
          </button>
          <button
            onClick={() => { setLoginType('admin'); setError(''); }}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              cursor: 'pointer',
              background: loginType === 'admin' ? '#4f46e5' : 'white',
              color: loginType === 'admin' ? 'white' : '#374151',
              fontWeight: 500
            }}
          >
            Admin
          </button>
        </div>

        {loginType === 'student' ? (
          <form onSubmit={handleStudentLogin}>
            <div className="form-group">
              <label htmlFor="studentId">Student ID</label>
              <input
                type="text"
                id="studentId"
                className="input"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter your student ID"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAdminLogin}>
            <div className="form-group">
              <label htmlFor="password">Admin Password</label>
              <input
                type="password"
                id="password"
                className="input"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
}

export default Login;
