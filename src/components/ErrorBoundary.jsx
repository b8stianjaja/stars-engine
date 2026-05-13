import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Canvas Error Caught by Boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#2a1b1b', color: '#ff6b6b', fontFamily: 'monospace', padding: '2rem'
        }}>
          <h2>Viewport Crash Detected</h2>
          <p>The Artist environment is protected. Developer runtime threw an error.</p>
          <pre style={{ background: '#111', padding: '1rem', borderRadius: '4px', maxWidth: '80%', overflow: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => this.setState({ hasError: false })}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#ff6b6b', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
          >
            Attempt Recovery
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
