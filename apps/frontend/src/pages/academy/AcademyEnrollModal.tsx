import React, { FormEvent } from 'react';
import { Loader2, X, GraduationCap } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs" dir="rtl">
      <div className="bg-card border border-border/70 rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-xl text-foreground text-right">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                التسجيل في الدورة: {selectedCourse.title}
              </h2>
              <p className="text-[11px] text-muted-foreground">تفعيل اشتراك فوري والبدء في التعلم</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          أدخل بيانات الطالب لتفعيل الوصول الفوري للدروس والتمارين وكوتش الذكاء الاصطناعي.
        </p>

        <form onSubmit={onSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">الاسم بالكامل <span className="text-destructive">*</span></label>
            <input
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="مثال: أحمد محمد"
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">رقم الهاتف / واتساب <span className="text-destructive">*</span></label>
            <input
              type="tel"
              required
              value={studentPhone}
              onChange={(e) => setStudentPhone(e.target.value)}
              placeholder="010XXXXXXXX"
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono tabular-nums dir-ltr text-right transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">البريد الإلكتروني <span className="text-muted-foreground font-normal">(اختياري)</span></label>
            <input
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono dir-ltr text-right transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={enrolling}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs disabled:opacity-50 transition-all active:scale-[0.98] flex items-center gap-1.5"
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
