import React from 'react';

/**
 * Top-level safety net that catches any React render/lifecycle error and
 * shows a friendly recovery screen instead of a white page.
 *
 * Anything thrown inside child components bubbles up to `componentDidCatch`;
 * we log it (so Sentry / console can pick it up) and render a reset UI.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Surface to any monitoring tooling. We deliberately keep this
    // dependency-free so the boundary works even before Sentry boots.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack || '');
    if (typeof window !== 'undefined' && typeof window.__svsReportError === 'function') {
      try { window.__svsReportError(error, info); } catch (_e) { /* ignore */ }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  handleHome = () => {
    if (typeof window !== 'undefined') window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const message = this.state.error?.message || 'Something unexpected happened.';
    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'linear-gradient(135deg, #f7fbff 0%, #e8f7fb 100%)',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          color: '#0f172a',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 520,
            background: '#ffffff',
            border: '1px solid #d4e3f1',
            borderRadius: 16,
            padding: 28,
            boxShadow: '0 20px 40px rgba(2,32,71,0.08)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 8 }}>⚠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f6674', margin: '0 0 8px' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: '#475569', margin: '0 0 18px', lineHeight: 1.55 }}>
            We hit an unexpected error and couldn&rsquo;t finish loading this page. Your data is safe.
            Try again, reload the page, or head back home.
          </p>
          <details style={{ textAlign: 'left', marginBottom: 18 }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              Technical details
            </summary>
            <pre
              style={{
                marginTop: 8,
                padding: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 11,
                color: '#334155',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {message}
            </pre>
          </details>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                background: '#0f6674',
                color: '#fff',
                border: 0,
                borderRadius: 8,
                padding: '10px 16px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                background: '#fff',
                color: '#0f6674',
                border: '1px solid #d6e6f5',
                borderRadius: 8,
                padding: '10px 16px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={this.handleHome}
              style={{
                background: '#fff',
                color: '#0f6674',
                border: '1px solid #d6e6f5',
                borderRadius: 8,
                padding: '10px 16px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
