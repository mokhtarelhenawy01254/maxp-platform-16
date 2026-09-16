import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (email: string, password: string, serverUrl: string) => Promise<{ success: boolean; error?: string }>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('swan@h2m.com');
  const [password, setPassword] = useState('0165676135');
  const [serverUrl, setServerUrl] = useState('https://maxp.online');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fillSwanAccount = () => {
    setEmail('swan@h2m.com');
    setPassword('0165676135');
    setServerUrl('https://maxp.online');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    try {
      const result = await onLogin(email.trim(), password.trim(), serverUrl.trim() || 'https://maxp.online');
      if (!result.success) {
        setError(result.error || 'فشل تسجيل الدخول. يرجى التأكد من البيانات.');
      }
    } catch (err: any) {
      setError(err.message || 'خطأ في الاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>MaxP Monitor</h1>
          <p style={styles.subtitle}>تتبع أداء وإنتاجية الموظف</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>رابط السيرفر (Server URL)</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://maxp.online"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>البريد الإلكتروني (Email)</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="swan@h2m.com"
              style={styles.input}
              required
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>كلمة المرور (Password)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
              {loading ? 'جاري الاتصال…' : 'تسجيل الدخول'}
            </button>

            <button
              type="button"
              onClick={fillSwanAccount}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#a1a1aa',
                borderRadius: '8px',
                padding: '8px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              استعادة بيانات تجربة حساب Swan
            </button>
          </div>
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
