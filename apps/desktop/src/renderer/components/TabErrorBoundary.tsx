import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  tabName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Per-tab crash isolation: an error in one screen must never take down the
 * whole shell. Mounted with a `key` per tab so switching tabs resets it.
 */
export class TabErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[TabErrorBoundary:${this.props.tabName}]`, error, info.componentStack);
  }

  private reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 24,
          backgroundColor: 'var(--bg-page)',
          color: 'var(--text-primary)',
        }}
      >
        <AlertTriangle size={22} color="var(--accent-yellow)" />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
            تعذر عرض شاشة {this.props.tabName}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', maxWidth: 420 }}>
            {this.state.error?.message || 'حدث خطأ غير متوقع في هذه الشاشة فقط — باقي التطبيق يعمل بشكل طبيعي.'}
          </div>
        </div>
        <button
          onClick={this.reset}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
            border: 'none',
            borderRadius: 6,
            padding: '7px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={12} />
          <span>إعادة تحميل الشاشة</span>
        </button>

        <button
          onClick={() => {
            try { window.electronAPI?.quitAndInstallUpdate(); } catch {}
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--accent-green-bg)',
            border: '1px solid var(--accent-green-border)',
            color: 'var(--accent-green)',
            borderRadius: 6,
            padding: '7px 14px',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
          title="لو فيه تحديث اتساب على الجهاز — ده هيثبته ويعيد التشغيل ويرجع الشاشة شغالة"
        >
          تثبيت التحديث الجاهز وإعادة التشغيل
        </button>
      </div>
    );
  }
}
