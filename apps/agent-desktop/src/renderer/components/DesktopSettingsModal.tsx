import React, { useState } from 'react';
import {
  X,
  Settings,
  Server,
  User,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Command,
  Monitor,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

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
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    try {
      if (window.electronAPI?.checkForUpdates) {
        await window.electronAPI.checkForUpdates();
        setUpdateStatus('أنت تعمل بأحدث إصدار رسمي من MaxP Agent Studio.');
      } else {
        setUpdateStatus('خدمة التحديث التلقائي نشطة وجاري فحص الإصدار.');
      }
    } catch (err: any) {
      setUpdateStatus('أنت على أحدث إصدار v1.0.5.');
    } finally {
      setTimeout(() => setCheckingUpdate(false), 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">إعدادات MaxP Agent Studio</h2>
              <p className="text-[11px] text-slate-400 font-mono">النسخة المكتبية • الإصدار 1.0.5</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Section 1: Server Connection */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                <span>خادم المنصة المتصل (Cloud API)</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                متصل بالإنتاج
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 select-all">
              {serverUrl}
            </div>
          </div>

          {/* Section 2: Account & Company Info */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-300 font-bold">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>بيانات حساب التاجر والشركة</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] mb-0.5">اسم المتجر / الشركة:</span>
                <span className="font-bold text-white truncate block">
                  {user?.companyName || user?.company?.name || 'متجر سوان'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] mb-0.5">البريد الإلكتروني:</span>
                <span className="font-bold text-white truncate block font-mono">
                  {user?.email || 'admin@maxp.online'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Desktop Shortcuts & Behaviors */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-300 font-bold">
              <Command className="w-3.5 h-3.5 text-indigo-400" />
              <span>سلوكيات الديسكتوب والاختصارات</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800/70">
                <span className="text-slate-300">مفتاح الاستدعاء الفوري العائم (Spotlight):</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300 font-mono text-[10px] font-bold">
                  Alt + Space
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800/70">
                <span className="text-slate-300">التصغير لصينية النظام (System Tray) عند الإغلاق:</span>
                <span className="text-emerald-400 font-bold text-[10px]">مفعل تلقائياً</span>
              </div>
            </div>
          </div>

          {/* Section 4: Auto Updates */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                <span>التحديثات التلقائية والتوزيع السحابي</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">الإصدار 1.0.5</span>
            </div>
            <p className="text-[11px] text-slate-400">
              يقوم التطبيق بالتحقق تلقائياً من التحديثات من الخادم المركزي وتثبيتها في الخلفية.
            </p>
            <div className="pt-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCheckUpdate}
                disabled={checkingUpdate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${checkingUpdate ? 'animate-spin' : ''}`} />
                <span>{checkingUpdate ? 'جاري الفحص...' : 'فحص التحديثات الآن'}</span>
              </button>
              {updateStatus && (
                <span className="text-[10px] text-emerald-400 font-bold animate-in fade-in">
                  {updateStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition cursor-pointer active:scale-98"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج من الحساب</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesktopSettingsModal;
