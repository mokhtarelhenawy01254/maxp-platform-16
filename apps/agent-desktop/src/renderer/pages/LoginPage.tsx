import React, { useState } from 'react';
import { Bot, Lock, Mail, Server, ChevronDown, ChevronUp, ArrowLeft, Sparkles } from 'lucide-react';

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
    <div className="min-h-full flex items-center justify-center p-6 bg-slate-950 text-slate-100 select-none">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900/90 border border-white/10 p-7 shadow-2xl backdrop-blur-xl">
        {/* Brand Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
            <Bot size={28} />
          </div>
          <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
            <span>MaxP Agent Studio</span>
            <span className="text-[10px] font-mono text-indigo-400 px-1.5 py-0.5 bg-indigo-950/60 border border-indigo-800/40 rounded">
              DESKTOP
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            غرفة قيادة الوكلاء الذكية لإدارة الإعلانات وتأكيد الطلبات
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center leading-relaxed">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
                <Mail size={15} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@store.com"
                required
                autoFocus
                className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              كلمة المرور
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
                <Lock size={15} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Collapsible Server URL */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-[11px] text-slate-500 hover:text-slate-400 py-1 transition-colors"
            >
              <span className="flex items-center gap-1">
                <Server size={12} />
                <span>إعدادات السيرفر السحابي</span>
              </span>
              {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showAdvanced && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://maxp.online"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/60 rounded-lg text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>تسجيل الدخول وفتح الاستوديو</span>
                <ArrowLeft size={14} />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-[10px] text-slate-500 font-mono">
          <span>MaxP Platform Ecosystem • Meta v21 & Veo 3.1</span>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
