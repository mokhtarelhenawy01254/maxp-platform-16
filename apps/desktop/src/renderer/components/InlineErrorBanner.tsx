import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Small non-blocking error strip shown inside a tab when its data fetch
 * fails — replaces silent empty lists that look like "no data".
 */
export const InlineErrorBanner: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'var(--accent-yellow-bg)',
      border: '1px solid var(--accent-yellow-border)',
      borderRadius: 8,
      padding: '8px 12px',
      flexShrink: 0,
    }}
  >
    <AlertCircle size={13} color="var(--accent-yellow)" />
    <span style={{ flex: 1, fontSize: 11.5, color: 'var(--text-primary)', textAlign: 'right' }}>
      {message}
    </span>
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          background: 'transparent',
          border: '1px solid var(--accent-yellow-border)',
          borderRadius: 5,
          color: 'var(--accent-yellow)',
          fontSize: 10.5,
          fontWeight: 600,
          padding: '3px 8px',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <RefreshCw size={11} />
        <span>إعادة المحاولة</span>
      </button>
    )}
  </div>
);
