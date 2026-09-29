import React, { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, Server, Lock, Mail, ArrowLeft } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, password: string, serverUrl: string) => Promise<{ success: boolean; error?: string }>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState('https://maxp.online');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    try {
      const result = await onLogin(
        email.trim(),
        password.trim(),
        serverUrl.trim() || 'https://maxp.online'
      );
      if (!result.success) {
        setError(result.error || 'بيانات الدخول غير صحيحة، يرجى التحقق وإعادة المحاولة.');
      }
    } catch (err: any) {
      setError(err.message || 'تعذر الاتصال بالسيرفر السحابي. تحقق من اتصال الإنترنت.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Brand & Header */}
        <div style={styles.header}>
          <div
            style={styles.brandIconWrapper}
            onDoubleClick={() => setShowAdvanced((prev) => !prev)}
            title="MaxP Workspace"
          >
            <ShieldCheck size={28} color="var(--accent-green)" />
          </div>
          <h1 style={styles.title}>MaxP Workspace</h1>
          <p style={styles.subtitle}>منظومة إنجاز الأعمال والإنتاجية المؤسسية</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Email Field */}
          <div style={styles.field}>
            <label style={styles.label}>البريد الإلكتروني</label>
            <div style={styles.inputWrapper}>
              <Mail size={15} style={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                style={styles.input}
                required
                autoFocus
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={styles.field}>
            <label style={styles.label}>كلمة المرور</label>
            <div style={styles.inputWrapper}>
              <Lock size={15} style={styles.inputIcon} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={styles.input}
                required
              />
            </div>
          </div>

          {/* Collapsible Server URL Field (Hidden by default for employees, unlocked via double-click on header) */}
          {showAdvanced && (
            <div style={styles.advancedBox}>
              <label style={styles.label}>رابط المنصة (Endpoint)</label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://maxp.online"
                style={styles.inputSimple}
              />
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              ...styles.button,
              opacity: loading || !email || !password ? 0.6 : 1,
              cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
            }}
            onMouseDown={(e) => {
              if (!loading && email && password) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            <span>{loading ? 'جاري التحقق والاتصال…' : 'دخول بيئة العمل'}</span>
            {!loading && <ArrowLeft size={16} />}
          </button>
        </form>

        {/* Footer Note */}
        <div style={styles.footerNote}>
          يتم مزامنة المهام وساعات العمل مع خوادم MaxP المركزية بأمان.
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-page)',
    padding: 16,
    direction: 'rtl',
    fontFamily: 'inherit',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    background: 'var(--bg-surface)',
    borderRadius: 14,
    border: '1px solid var(--border-default)',
    padding: '32px 28px',
    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.7), inset 0 1px 0 var(--border-subtle)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 24,
  },
  brandIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'var(--accent-green-bg)',
    border: '1px solid var(--accent-green-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--text-dim)',
    marginTop: 6,
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    right: 12,
    color: 'var(--text-dim)',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-strong)',
    borderRadius: 9,
    padding: '10px 38px 10px 14px',
    fontSize: 13,
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 160ms, box-shadow 160ms',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  inputSimple: {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-strong)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    marginTop: 4,
  },
  advancedToggleRow: {
    display: 'flex',
    justifyContent: 'flex-start',
  },
  advancedToggleBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    fontSize: 11,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: 0,
    fontFamily: 'inherit',
    transition: 'color 160ms',
  },
  advancedBox: {
    background: 'var(--bg-topbar)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  button: {
    background: 'var(--btn-primary-bg)',
    color: 'var(--btn-primary-text)',
    border: 'none',
    borderRadius: 9,
    padding: '11px 16px',
    fontSize: 13,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    fontFamily: 'inherit',
    transition: 'transform 160ms ease-out, opacity 160ms',
  },
  error: {
    background: 'var(--accent-red-bg)',
    border: '1px solid var(--accent-red-border)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 12,
    color: 'var(--accent-red-dim)',
    lineHeight: 1.4,
  },
  footerNote: {
    marginTop: 20,
    fontSize: 11,
    color: 'var(--text-dimmer)',
    textAlign: 'center',
    lineHeight: 1.5,
  },
};

export default LoginPage;
