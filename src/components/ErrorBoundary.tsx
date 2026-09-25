import React from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorReferenceId: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorReferenceId: '',
    };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    // Generate a non-sensitive internal reference ID without exposing stack traces or file paths (Requirement #25)
    const randomHex = Math.floor(100000 + Math.random() * 900000)
      .toString(16)
      .toUpperCase();
    return {
      hasError: true,
      errorReferenceId: `ERR-${randomHex}`,
    };
  }

  componentDidCatch() {
    // Intentionally suppress raw stack traces in production UI
  }

  private handleReload = () => {
    this.setState({ hasError: false, errorReferenceId: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#020c08',
            color: '#f8fafc',
            fontFamily: 'Outfit, sans-serif',
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: '420px',
              width: '100%',
              padding: '28px',
              borderRadius: '20px',
              background: 'rgba(6, 22, 15, 0.96)',
              border: '1px solid rgba(248, 113, 113, 0.45)',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.9)',
              textAlign: 'center',
            }}
          >
            <ShieldAlert
              size={36}
              style={{ color: '#f87171', marginBottom: '12px' }}
            />
            <h2
              style={{
                margin: '0 0 8px',
                fontSize: '20px',
                fontWeight: 800,
                letterSpacing: '1.5px',
              }}
            >
              TEMPORARY TABLE INTERRUPTION
            </h2>
            <p
              style={{
                margin: '0 0 16px',
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'rgba(226, 232, 240, 0.82)',
              }}
            >
              An unexpected display issue occurred. No personal data was
              affected, and internal system details have been hidden for your
              security.
            </p>
            <div
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '999px',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#fde047',
                marginBottom: '18px',
              }}
            >
              Reference ID: {this.state.errorReferenceId}
            </div>
            <div>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: '999px',
                  border: '1px solid #fbbf24',
                  background: 'linear-gradient(135deg, #f59e0b, #b45309)',
                  color: '#02100a',
                  fontWeight: 800,
                  fontSize: '12px',
                  letterSpacing: '1.2px',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={14} />
                <span>RETURN TO TABLE</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
