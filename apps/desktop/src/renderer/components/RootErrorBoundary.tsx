import React, { Component, ErrorInfo, ReactNode } from 'react';
import TitleBar from './TitleBar';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[RootErrorBoundary] Caught uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetCache = () => {
    try {
      localStorage.removeItem('maxp_active_tasks_multi');
      localStorage.removeItem('maxp_active_task');
      localStorage.removeItem('maxp_active_tab');
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#09090b', color: '#fafafa', overflow: 'hidden' }}>
          <TitleBar />
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            textAlign: 'center',
            fontFamily: 'inherit',
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <AlertTriangle size={26} color="#ef4444" />
            </div>

            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#f4f4f5' }}>
              تعذر تحميل واجهة التطبيق مؤقتاً
            </h2>
            <p style={{ fontSize: 12.5, color: '#a1a1aa', maxWidth: 440, lineHeight: 1.6, marginBottom: 16 }}>
              حدث خطأ غير متوقع أثناء معالجة بيانات الشاشة. يمكنك إعادة التحميل أو إعادة ضبط الذاكرة المؤقتة لمواصلة العمل.
            </p>

            {this.state.error?.message && (
              <div style={{
                maxWidth: 480,
                width: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 11,
                fontFamily: 'monospace',
                color: '#f87171',
                textAlign: 'left',
                direction: 'ltr',
                marginBottom: 20,
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
              }}>
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 16px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 120ms ease-out',
                }}
              >
                <RefreshCw size={13} />
                <span>إعادة تحميل الواجهة</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: '#e4e4e7',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 120ms ease-out',
                }}
              >
                <Trash2 size={13} color="#f59e0b" />
                <span>إعادة ضبط الذاكرة المؤقتة</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default RootErrorBoundary;
