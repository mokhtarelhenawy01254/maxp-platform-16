import { FileText } from "lucide-react";

interface AcademyLessonScriptTabProps {
  scriptText?: string | null;
}

export function AcademyLessonScriptTab({ scriptText }: AcademyLessonScriptTabProps) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/70 space-y-3 shadow-xs text-right" dir="rtl">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
          <FileText className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-sm font-bold text-foreground">
          نص الشرح الكامل والسكريبت المعتمد للدرس
        </h3>
      </div>
      <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans p-3.5 rounded-xl bg-muted/20 border border-border/40">
        {scriptText || "لا يوجد نص سكريبت تفصيلي متاح لهذا الدرس حالياً."}
      </div>
    </div>
  );
}
