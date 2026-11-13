import React from 'react';
import { X, Check, Save, ShieldAlert, Sparkles, Smartphone, Bell } from 'lucide-react';
import type { EducationFlowSettings } from './types';

interface EducationFlowSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EducationFlowSettings;
  onChangeSettings: React.Dispatch<React.SetStateAction<EducationFlowSettings>>;
  onSave: () => void;
  isSaving: boolean;
  successMessage: string | null;
}

export const EducationFlowSettingsDrawer: React.FC<EducationFlowSettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onChangeSettings,
  onSave,
  isSaving,
  successMessage,
}) => {
  if (!isOpen) return null;

  const toggle = (key: keyof EducationFlowSettings) => {
    onChangeSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-card border-l border-border h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              سياسات وقواعد مسارات الرسايل
            </h3>
            <p className="text-[11px] text-muted-foreground">
              التحكم في قواعد نافذة الـ 24 ساعة، توفير تكاليف واتساب، والذكاء الاصطناعي
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Toggle 1: AI Auto Reply */}
          <div className="p-3.5 rounded-xl border border-border bg-card flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>الرد التلقائي بالذكاء الاصطناعي 24/7</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                تشغيل وكيل «نور» للرد الفوري على استفسارات أولياء الأمور وحجز الديمو داي على مدار الساعة.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggle('aiAutoReply')}
              className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
                settings.aiAutoReply ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                  settings.aiAutoReply ? 'right-5' : 'right-0.5'
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: pushFirstSaveWhatsApp */}
          <div className="p-3.5 rounded-xl border border-border bg-card flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                <span>أولوية إشعار الويب (توفير واتساب)</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                إرسال إشعارات الحصص والتأكيدات لبوابة ولي الأمر كـ Web Push مجاناً أولاً، واللجوء لواتساب كبديل فقط.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggle('pushFirstSaveWhatsApp')}
              className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
                settings.pushFirstSaveWhatsApp ? 'bg-emerald-500' : 'bg-muted'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                  settings.pushFirstSaveWhatsApp ? 'right-5' : 'right-0.5'
                }`}
              />
            </button>
          </div>

          {/* Toggle 3: Strict 24h Window Guard */}
          <div className="p-3.5 rounded-xl border border-border bg-card flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <span>الحظر الصارم خارج نافذة الـ 24 ساعة (Zero-Ban)</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                منع إرسال أي رسائل حرة خارج الـ 24h وقصر الإرسال على قوالب Meta Utility المعتمدة لحماية حساب الواتساب.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggle('strict24hEnforcement')}
              className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
                settings.strict24hEnforcement ? 'bg-amber-500' : 'bg-muted'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                  settings.strict24hEnforcement ? 'right-5' : 'right-0.5'
                }`}
              />
            </button>
          </div>

          {/* Toggle 4: Notify Teacher */}
          <div className="p-3.5 rounded-xl border border-border bg-card flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-blue-500" />
                <span>إشعار المدرس تلقائياً بالحصص الجديدة</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                إرسال رسالة واتساب للمدرس/المهندس بمجرد جدولة أي حصة جديدة تتضمن اسم الطالب والتوقيت.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggle('notifyTeacherOnSchedule')}
              className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
                settings.notifyTeacherOnSchedule ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                  settings.notifyTeacherOnSchedule ? 'right-5' : 'right-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end gap-2 bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onSave}
            className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'جاري الحفظ...' : 'حفظ السياسات'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
