import React, { FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import { Course } from './academyApi';

interface AcademyEnrollModalProps {
  selectedCourse: Course | null;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  studentName: string;
  setStudentName: (val: string) => void;
  studentPhone: string;
  setStudentPhone: (val: string) => void;
  studentEmail: string;
  setStudentEmail: (val: string) => void;
  enrolling: boolean;
}

export const AcademyEnrollModal: React.FC<AcademyEnrollModalProps> = ({
  selectedCourse,
  onClose,
  onSubmit,
  studentName,
  setStudentName,
  studentPhone,
  setStudentPhone,
  studentEmail,
  setStudentEmail,
  enrolling,
}) => {
  if (!selectedCourse) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="bg-card border border-border/70 rounded-xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl text-foreground">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 className="text-sm sm:text-base font-bold text-foreground">
            التسجيل في دورة: {selectedCourse.title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          أدخل بياناتك لتفعيل اشتراكك الفوري وبدء مشاهدة الدروس وتدريبات الكوتش الذكي.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">الاسم بالكامل *</label>
            <input
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="مثال: أحمد محمد"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">رقم الهاتف / واتساب *</label>
            <input
              type="tel"
              required
              value={studentPhone}
              onChange={(e) => setStudentPhone(e.target.value)}
              placeholder="010XXXXXXXX"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">البريد الإلكتروني (اختياري)</label>
            <input
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-border/70 text-muted-foreground hover:bg-muted/50 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={enrolling}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {enrolling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>تأكيد والبدء فوراً</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
