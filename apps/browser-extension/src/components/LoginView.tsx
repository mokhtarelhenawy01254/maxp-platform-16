import React, { useState } from 'react';
import { Lock, Mail, Server, ArrowRight, ShieldCheck, Key } from 'lucide-react';
import { loginToMaxP } from '../services/api';
import { chromeStorage } from '../services/chrome';
import { UserSession } from '../types/extension';

interface LoginViewProps {
  serverUrl: string;
  onLoginSuccess: (session: UserSession) => void;
  onOpenSettings: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  serverUrl,
  onLoginSuccess,
  onOpenSettings,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setError(null);

    try {
      const session = await loginToMaxP(email, password, serverUrl);
      onLoginSuccess(session);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول، تحقق من البيانات والسيرفر');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;

    const session: UserSession = {
      token: manualToken.trim(),
      user: {
        id: 'token_user',
        name: 'مستخدم MaxP',
        email: 'merchant@maxp.online',
        role: 'MERCHANT',
      },
    };

    await chromeStorage.saveSession(session);
    onLoginSuccess(session);
  };

  return (
    <div className="flex flex-col h-full justify-between p-4 bg-[#09090b] text-slate-100 select-none">
      {/* Top Banner */}
      <div className="flex flex-col items-center text-center mt-3 space-y-2">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight">تسجيل الدخول إلى MaxP</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            اربط الإضافة بحسابك للوصول إلى أدوات المتجر والذكاء الاصطناعي
          </p>
        </div>
      </div>

      {/* Login Form */}
      <div className="my-auto py-2">
        {error && (
          <div className="mb-3 p-2 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-200 text-[11px] leading-tight text-center">
            {error}
          </div>
        )}

        {!showTokenInput ? (
          <form onSubmit={handleLogin} className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-medium text-slate-400 mb-1">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#141417] border border-white/10 rounded-lg px-2.5 py-1.5 pl-8 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500"
                />
                <Mail className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-400 mb-1">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#141417] border border-white/10 rounded-lg px-2.5 py-1.5 pl-8 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500"
                />
                <Lock className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              <span>{isLoading ? 'جارِ التحقق…' : 'دخول'}</span>
              <ArrowRight className="w-3.5 h-3.5 -scale-x-100" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleManualTokenSubmit} className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-medium text-slate-400 mb-1">
                رمز الدخول السريع (JWT Token)
              </label>
              <div className="relative">
                <textarea
                  rows={3}
                  required
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="ألصق الرمز هنا مباشرة من لوحة التحكم"
                  className="w-full bg-[#141417] border border-white/10 rounded-lg p-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              <span>حفظ الرمز وتفعيل المساعد</span>
            </button>
          </form>
        )}

        <div className="text-center mt-3">
          <button
            type="button"
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="text-[10px] text-slate-400 hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
          >
            <Key className="w-3 h-3" />
            <span>{showTokenInput ? 'العودة للدخول بالبريد' : 'أو الدخول باستخدام Token مباشرة'}</span>
          </button>
        </div>
      </div>

      {/* Footer / Server Info */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-1">
          <Server className="w-3 h-3 text-slate-500" />
          <span className="font-mono truncate max-w-[170px]">{serverUrl}</span>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="text-indigo-400 hover:underline cursor-pointer"
        >
          تغيير السيرفر
        </button>
      </div>
    </div>
  );
};
