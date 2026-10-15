import { Sparkles } from "lucide-react";

interface AcademyLessonScriptTabProps {
  scriptText?: string | null;
}

export function AcademyLessonScriptTab({ scriptText }: AcademyLessonScriptTabProps) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/70 space-y-3 shadow-xs">
      <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-primary" />
        <span>نص الشرح الكامل والسكريبت المعتمد</span>
      </h3>
      <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">
        {scriptText || "لا يوجد نص سكريبت تفصيلي متاح لهذا الدرس."}
      </div>
    </div>
  );
}
