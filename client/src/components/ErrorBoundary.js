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
      // Fallback UI - uses CSS variables for theme support
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text-muted)'
        }}>
          <div style={{
            maxWidth: '500px',
            textAlign: 'center',
            padding: '40px',
            backgroundColor: 'var(--color-bg-card-solid)',
            borderRadius: '12px',
            border: '1px solid var(--color-primary)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <h1 style={{
              fontSize: '24px',
              marginBottom: '16px',
              color: 'var(--color-primary)'
            }}>
              Something went wrong
            </h1>
            <p style={{
              fontSize: '14px',
              color: 'var(--color-text-muted)',
              marginBottom: '24px'
            }}>
              An unexpected error occurred. Please try refreshing the page or going back to the home page.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{
                textAlign: 'left',
                marginBottom: '24px',
                padding: '12px',
                backgroundColor: 'var(--color-bg-input)',
                borderRadius: '8px',
                fontSize: '12px'
              }}>
                <summary style={{ cursor: 'pointer', color: 'var(--color-warning)', marginBottom: '8px' }}>
                  Error Details (Dev Only)
                </summary>
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: 'var(--color-danger)',
                  margin: '8px 0'
                }}>
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'var(--color-text-subtle)',
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
                className="btn btn-primary"
              >
                Refresh Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="btn btn-secondary"
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
