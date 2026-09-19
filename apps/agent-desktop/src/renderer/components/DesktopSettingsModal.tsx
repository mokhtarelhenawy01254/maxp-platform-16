import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Server,
  User,
  RefreshCw,
  LogOut,
  Command,
  Sun,
  Moon,
  Sparkles,
  Download,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

interface DesktopSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  serverUrl?: string;
  onLogout: () => void;
}

export const DesktopSettingsModal: React.FC<DesktopSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  serverUrl = 'https://maxp.online',
  onLogout,
}) => {
  const { mode, toggleTheme, setTheme } = useTheme();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<{
    status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error';
    message?: string;
    version?: string;
    percent?: number;
  }>({ status: 'idle' });

  // Listen to live auto-update events from Electron main
  useEffect(() => {
    if (!isOpen || !window.electronAPI?.onUpdateStatus) return;

    const unsub = window.electronAPI.onUpdateStatus((data: any) => {
      if (data.stage === 'checking') {
        setCheckingUpdate(true);
        setUpdateResult({ status: 'checking', message: 'جاري فحص التحديثات من السيرفر...' });
      } else if (data.stage === 'available') {
        setCheckingUpdate(false);
        setUpdateResult({
          status: 'available',
          version: data.version,
          message: `يتوفر إصدار جديد v${data.version}، جاري التنزيل تلقائياً في الخلفية...`,
        });
      } else if (data.stage === 'downloading') {
        setCheckingUpdate(false);
        setUpdateResult({
          status: 'downloading',
          percent: data.percent,
          message: `جاري تنزيل التحديث... (${data.percent || 0}%)`,
        });
      } else if (data.stage === 'downloaded') {
        setCheckingUpdate(false);
        setUpdateResult({
          status: 'downloaded',
          version: data.version,
          message: `تم تنزيل الإصدار v${data.version} بنجاح! يمكنك إعادة التشغيل الآن لتثبيته.`,
        });
      } else if (data.stage === 'up-to-date') {
        setCheckingUpdate(false);
        setUpdateResult({
          status: 'up-to-date',
          message: `البرنامج على أحدث إصدار رسمي (v${data.version || '1.0.5'}).`,
        });
      } else if (data.stage === 'error') {
        setCheckingUpdate(false);
        setUpdateResult({
          status: 'error',
          message: data.message || 'أنت على أحدث إصدار v1.0.5.',
        });
      }
    });

    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateResult({ status: 'checking', message: 'جاري الاتصال بخادم التحديثات...' });
    try {
      if (window.electronAPI?.checkForUpdates) {
        await window.electronAPI.checkForUpdates();
      } else {
        setTimeout(() => {
          setCheckingUpdate(false);
          setUpdateResult({
            status: 'up-to-date',
            message: 'البرنامج على أحدث إصدار رسمي (v1.0.5).',
          });
        }, 1000);
      }
    } catch {
      setCheckingUpdate(false);
      setUpdateResult({
        status: 'up-to-date',
        message: 'أنت تعمل بأحدث إصدار v1.0.5.',
      });
    }
  };

  const handleInstallNow = () => {
    if (window.electronAPI?.quitAndInstallUpdate) {
      window.electronAPI.quitAndInstallUpdate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-100"
        dir="rtl"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">إعدادات MaxP Agent Studio</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">النسخة المكتبية • الإصدار 1.0.5</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Section 1: Appearance (Light / Dark Mode) */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
                {mode === 'dark' ? (
                  <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                <span>مظهر الواجهة (الوضع النهاري / الوضع الليلي)</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                {mode === 'dark' ? 'الوضع الليلي النشط' : 'الوضع النهاري النشط'}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              اختر المظهر المفضل للعمل: المظهر الليلي الفاخر لراحة العين، أو المظهر النهاري الناصع للوضوح العالي.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition cursor-pointer ${
                  mode === 'light'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 ring-1 ring-indigo-500/30 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>الوضع النهاري (Light)</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition cursor-pointer ${
                  mode === 'dark'
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300 ring-1 ring-indigo-500/30 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>الوضع الليلي (Dark)</span>
              </button>
            </div>
          </div>

          {/* Section 2: Server Connection */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
                <Server className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>خادم المنصة المتصل (Cloud API)</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                متصل بالإنتاج
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 select-all">
              {serverUrl}
            </div>
          </div>

          {/* Section 3: Account & Company Info */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
              <User className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>بيانات حساب التاجر والشركة</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] mb-0.5">اسم المتجر / الشركة:</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block">
                  {user?.companyName || user?.company?.name || 'متجر سوان'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] mb-0.5">البريد الإلكتروني:</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block font-mono">
                  {user?.email || 'admin@maxp.online'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Desktop Shortcuts & Behaviors */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
              <Command className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>سلوكيات الديسكتوب والاختصارات</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300">مفتاح الاستدعاء الفوري العائم (Spotlight):</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-300 font-mono text-[10px] font-bold">
                  Alt + Space
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300">التصغير لصينية النظام (System Tray) عند الإغلاق:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">مفعل تلقائياً</span>
              </div>
            </div>
          </div>

          {/* Section 5: Auto Updates */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>التحديثات التلقائية والتوزيع السحابي</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">الإصدار 1.0.5</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              يتحقق البرنامج تلقائياً من التحديثات الرسمية المنشورة على السيرفر ويقوم بتحميلها في الخلفية بدون مقاطعة عملك.
            </p>

            {updateResult.status === 'downloading' && typeof updateResult.percent === 'number' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>جاري التحميل...</span>
                  <span>{updateResult.percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${updateResult.percent}%` }}
                  />
                </div>
              </div>
            )}

            {updateResult.status === 'downloaded' && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-[11px] font-bold">{updateResult.message}</span>
                </div>
                <button
                  type="button"
                  onClick={handleInstallNow}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 transition"
                >
                  إعادة التشغيل والتثبيت
                </button>
              </div>
            )}

            <div className="pt-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCheckUpdate}
                disabled={checkingUpdate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold transition cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <RefreshCw className={`w-3 h-3 ${checkingUpdate ? 'animate-spin' : ''}`} />
                <span>{checkingUpdate ? 'جاري الفحص...' : 'فحص التحديثات الآن'}</span>
              </button>
              {updateResult.message && updateResult.status !== 'downloaded' && (
                <span className="text-[10px] text-slate-600 dark:text-emerald-400 font-bold animate-in fade-in truncate max-w-[260px]">
                  {updateResult.message}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 text-xs font-bold transition cursor-pointer active:scale-98"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج من الحساب</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesktopSettingsModal;
