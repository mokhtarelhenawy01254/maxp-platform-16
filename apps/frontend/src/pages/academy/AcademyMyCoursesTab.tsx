import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Award, ArrowLeft } from 'lucide-react';
import { MyEnrollment } from './academyApi';

interface AcademyMyCoursesTabProps {
  myEnrollments: MyEnrollment[];
  onBrowseCatalog: () => void;
}

export const AcademyMyCoursesTab: React.FC<AcademyMyCoursesTabProps> = ({
  myEnrollments,
  onBrowseCatalog,
}) => {
  if (myEnrollments.length === 0) {
    return (
      <div className="p-8 sm:p-12 rounded-2xl bg-card border border-dashed border-border/80 text-center space-y-3 shadow-xs" dir="rtl">
        <div className="w-10 h-10 rounded-xl bg-muted/30 text-muted-foreground flex items-center justify-center mx-auto">
          <BookOpen className="w-5 h-5" />
        </div>
        <h3 className="text-xs sm:text-sm font-bold text-foreground">لم تشترك في أي دورة بعد</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          تصفح كتالوج الدورات واختر الدورة المناسبة لبدء رحلتك التعليمية مع كوتش الذكاء الاصطناعي.
        </p>
        <button
          onClick={onBrowseCatalog}
          className="mt-1 px-4 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition active:scale-[0.98]"
        >
          تصفح الكتالوج الآن
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5" dir="rtl">
      {myEnrollments.map((enr) => (
        <div
          key={enr.enrollmentId}
          className="rounded-2xl bg-card border border-border/70 p-4 sm:p-5 space-y-4 flex flex-col justify-between shadow-xs hover:border-border transition-colors"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                {enr.status === 'COMPLETED' ? 'مكتملة بنجاح' : 'قيد التعلم'}
              </span>
              {enr.certificate && (
                <a
                  href={`/api/v1/academy/certificates/${enr.enrollmentId}/view`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-amber-500 hover:text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>عرض الشهادة المعتمدة</span>
                </a>
              )}
            </div>

            <h3 className="text-base font-bold text-foreground">{enr.course.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{enr.course.description}</p>

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="text-[11px] font-medium">نسبة الإنجاز</span>
                <span className="font-mono text-primary font-bold tabular-nums">{enr.progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-muted/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(enr.progressPercent, 4)}%` }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                أكملت {enr.completedCount} من أصل {enr.totalLessons} درساً
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60">
            <Link
              to={`/academy/catalog/${enr.course.id}`}
              className="w-full py-2 rounded-lg text-center text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <span>متابعة الكورس الآن</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};
