import React from 'react';

/**
 * Error Boundary component to catch JavaScript errors in child components
 * and display a fallback UI instead of crashing the whole app.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console (could send to logging service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backgroundColor: '#0a0a0a',
          color: '#4ade80'
        }}>
          <div style={{
            maxWidth: '500px',
            textAlign: 'center',
            padding: '40px',
            backgroundColor: '#111',
            borderRadius: '12px',
            border: '1px solid #2a2a2a'
          }}>
            <h1 style={{
              fontSize: '24px',
              marginBottom: '16px',
              color: '#22c55e'
            }}>
              Something went wrong
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#4a7c59',
              marginBottom: '24px'
            }}>
              An unexpected error occurred. Please try refreshing the page or going back to the home page.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{
                textAlign: 'left',
                marginBottom: '24px',
                padding: '12px',
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                fontSize: '12px'
              }}>
                <summary style={{ cursor: 'pointer', color: '#f59e0b', marginBottom: '8px' }}>
                  Error Details (Dev Only)
                </summary>
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#ef4444',
                  margin: '8px 0'
                }}>
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: '#6b7280',
                    fontSize: '10px'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#22c55e',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                Refresh Page
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#333',
                  color: '#4ade80',
                  border: '1px solid #4a7c59',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
