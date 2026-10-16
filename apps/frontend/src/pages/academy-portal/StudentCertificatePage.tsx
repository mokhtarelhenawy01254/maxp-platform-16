import React from "react";
import { useParams, Link } from "react-router-dom";
import { Award, ArrowRight, Printer, AlertCircle } from "lucide-react";

const StudentCertificatePage: React.FC = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();

  if (!enrollmentId) {
    return (
      <div className="bg-card rounded-2xl p-8 border border-border/70 text-center space-y-4 shadow-xs text-right" dir="rtl">
        <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-foreground">لم يتم تحديد معرّف الشهادة</p>
        <Link to="/portal/my-courses" className="text-xs text-primary font-semibold underline hover:opacity-80 transition-opacity">
          العودة لكورساتي
        </Link>
      </div>
    );
  }

  const certificateUrl = `/api/v1/academy/certificates/${enrollmentId}/view`;

  return (
    <div className="space-y-5 text-right" dir="rtl">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-border/70 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-foreground tracking-tight">شهادة إتمام الكورس</h1>
            <p className="text-xs text-muted-foreground">تهانينا على إتمام مسارك التعليمي بنجاح!</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all active:scale-[0.98] shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الشهادة</span>
          </button>
          <Link
            to="/portal/my-courses"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors active:scale-[0.98]"
          >
            <span>كورساتي</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Certificate Frame */}
      <div className="bg-card rounded-2xl border border-border/70 shadow-xs overflow-hidden min-h-[650px]">
        <iframe
          src={certificateUrl}
          title="شهادة إتمام الكورس"
          className="w-full min-h-[650px] border-0 bg-background"
        />
      </div>
    </div>
  );
};

export default StudentCertificatePage;
