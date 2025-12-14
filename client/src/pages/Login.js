import React, { useState } from 'react';
import { useAuth, useTheme } from '../contexts';

function Login() {
  const { login } = useAuth();
  const { theme } = useTheme();
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

      login(data.user, data.token);
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

      login(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isLight = theme === 'light';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isLight ? '#f8fafc' : '#000000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        backgroundColor: isLight ? '#ffffff' : '#111111',
        borderRadius: '16px',
        padding: '40px',
        border: isLight ? '1px solid #16a34a' : '1px solid #22c55e',
        boxShadow: isLight ? '0 4px 16px rgba(0, 0, 0, 0.1)' : 'none'
      }}>
        <h1 style={{
          textAlign: 'center',
          marginBottom: '8px',
          color: isLight ? '#16a34a' : '#22c55e',
          fontSize: '28px',
          fontWeight: 'bold'
        }}>
          Welcome to the
        </h1>
        <h2 style={{
          textAlign: 'center',
          marginBottom: '12px',
          color: isLight ? '#16a34a' : '#22c55e',
          fontSize: '32px',
          fontWeight: 'bold'
        }}>
          Hawkins Leadership Hub
        </h2>
        <p style={{
          textAlign: 'center',
          color: isLight ? '#475569' : '#4ade80',
          marginBottom: '32px',
          fontSize: '16px'
        }}>
          Empowering student leaders, one hour at a time.
        </p>

        <div style={{
          display: 'flex',
          marginBottom: '24px',
          borderRadius: '8px',
          overflow: 'hidden',
          border: isLight ? '1px solid #16a34a' : '1px solid #22c55e'
        }}>
          <button
            onClick={() => { setLoginType('student'); setError(''); }}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              cursor: 'pointer',
              background: loginType === 'student'
                ? (isLight ? '#16a34a' : '#22c55e')
                : (isLight ? '#f1f5f9' : '#1a1a1a'),
              color: loginType === 'student'
                ? (isLight ? '#ffffff' : '#000000')
                : (isLight ? '#16a34a' : '#22c55e'),
              fontWeight: 600,
              transition: 'all 0.2s ease'
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
              background: loginType === 'admin'
                ? (isLight ? '#16a34a' : '#22c55e')
                : (isLight ? '#f1f5f9' : '#1a1a1a'),
              color: loginType === 'admin'
                ? (isLight ? '#ffffff' : '#000000')
                : (isLight ? '#16a34a' : '#22c55e'),
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
          >
            Admin
          </button>
        </div>

        {loginType === 'student' ? (
          <form onSubmit={handleStudentLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="studentId" style={{
                display: 'block',
                marginBottom: '8px',
                color: isLight ? '#16a34a' : '#22c55e',
                fontWeight: 500
              }}>
                Student ID
              </label>
              <input
                type="text"
                id="studentId"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter your student ID"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: isLight ? '1px solid #16a34a' : '1px solid #22c55e',
                  backgroundColor: isLight ? '#f8fafc' : '#1a1a1a',
                  color: isLight ? '#1e293b' : '#22c55e',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isLight ? '#16a34a' : '#22c55e',
                color: isLight ? '#ffffff' : '#000000',
                fontSize: '16px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAdminLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="password" style={{
                display: 'block',
                marginBottom: '8px',
                color: isLight ? '#16a34a' : '#22c55e',
                fontWeight: 500
              }}>
                Admin Password
              </label>
              <input
                type="password"
                id="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: isLight ? '1px solid #16a34a' : '1px solid #22c55e',
                  backgroundColor: isLight ? '#f8fafc' : '#1a1a1a',
                  color: isLight ? '#1e293b' : '#22c55e',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isLight ? '#16a34a' : '#22c55e',
                color: isLight ? '#ffffff' : '#000000',
                fontSize: '16px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {error && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
