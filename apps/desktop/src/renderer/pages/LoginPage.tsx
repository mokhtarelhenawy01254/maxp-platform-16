import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (email: string, password: string, serverUrl: string) => Promise<{ success: boolean; error?: string }>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState('https://maxp.online');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !serverUrl) return;

    setLoading(true);
    setError('');

    try {
      const result = await onLogin(email, password, serverUrl);
      if (!result.success) {
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>MaxP Monitor</h1>
          <p style={styles.subtitle}>Employee Activity Tracker</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Server URL</label>
            <input
              type="url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://maxp.online"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={styles.input}
              required
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
              style={styles.input}
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              transform: 'scale(1)',
              transition: 'transform 160ms ease-out, opacity 200ms',
            }}
            onMouseDown={(e) => {
              (e.target as HTMLElement).style.transform = 'scale(0.97)';
            }}
            onMouseUp={(e) => {
              (e.target as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            {loading ? 'Connecting\u2026' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#09090b',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    background: '#121214',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.06)',
    padding: 28,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#fafafa',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: 13,
    color: '#71717a',
    marginTop: 6,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: '#a1a1aa',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  input: {
    background: '#09090b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    color: '#fafafa',
    outline: 'none',
    transition: 'border-color 200ms',
    fontFamily: 'inherit',
  },
  button: {
    background: '#fafafa',
    color: '#09090b',
    border: 'none',
    borderRadius: 8,
    padding: '11px 0',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
    fontFamily: 'inherit',
  },
  error: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    color: '#fca5a5',
  },
};

export default LoginPage;
