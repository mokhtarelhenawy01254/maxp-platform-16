import React, { useState } from 'react';
import { X, Send, Check, Smartphone } from 'lucide-react';
import { buildApiUrl } from '../../../utils/urlHelper';
import {
  getCompanyId as getEducationCompanyId,
  getAuthHeaders as getEducationAuthHeaders,
} from '../education-management/api';

interface EducationFlowTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EducationFlowTestModal: React.FC<EducationFlowTestModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [phone, setPhone] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('education_session_reminder');
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!phone.trim()) {
      setFeedback({ success: false, msg: 'يرجى كتابة رقم الهاتف أولاً' });
      return;
    }
    setIsSending(true);
    setFeedback(null);
    try {
      const companyId = getEducationCompanyId();
      const base = buildApiUrl('education/notifications/test');
      const url = new URL(base, window.location.origin);
      if (companyId) url.searchParams.set('companyId', companyId);

      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getEducationAuthHeaders(),
        },
        body: JSON.stringify({
          phone: phone.trim(),
          eventType: selectedEvent,
          parentName: 'ولي أمر تجريبي',
          studentName: 'ياسين',
        }),
      });

      const json = await res.json();
      if (res.ok && json.success !== false) {
        setFeedback({ success: true, msg: 'تم إرسال الرسالة التجريبية لواتساب بنجاح ✅' });
      } else {
        setFeedback({ success: false, msg: json.error || 'تعذر إرسال التجربة' });
      }
    } catch (err: any) {
      setFeedback({ success: false, msg: err.message || 'خطأ في الاتصال' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground">
              إرسال رسالة تجريبية على واتساب
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-3.5 text-right">
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                feedback.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
              }`}
            >
              <span>{feedback.msg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              رقم واتساب للتجربة:
            </label>
            <input
              type="text"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01012345678"
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              نوع الرسالة المراد تجربتها:
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="education_session_reminder">تذكير بموعد الديمو داي (قبل 24 ساعة)</option>
              <option value="education_enrollment_created">تأكيد الاشتراك وتفعيل الباقة</option>
              <option value="education_session_confirmed">تأكيد الحصة ورصيد الساعات المتبقي</option>
              <option value="education_enrollment_low_hours">تنبيه رصيد الساعات أوشك على الانتهاء</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-muted-foreground hover:text-foreground"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={isSending}
            onClick={handleSend}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSending ? 'جاري الإرسال...' : 'إرسال الآن'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
