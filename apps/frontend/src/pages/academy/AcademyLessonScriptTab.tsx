import React, { useState } from "react";
import { FileText, Eye, Code2 } from "lucide-react";
import { AcademyScriptViewer } from "../academy-portal/components/AcademyScriptViewer";

interface AcademyLessonScriptTabProps {
  scriptText?: string | null;
}

export function AcademyLessonScriptTab({ scriptText }: AcademyLessonScriptTabProps) {
  const [viewMode, setViewMode] = useState<"clean" | "raw">("clean");

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/70 space-y-4 shadow-xs text-right" dir="rtl">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            نص الشرح وسكريبت الدرس للطالب
          </h3>
        </div>

        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setViewMode("clean")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              viewMode === "clean"
                ? "bg-card text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>عرض الطالب المنظم</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("raw")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              viewMode === "raw"
                ? "bg-card text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>السكريبت الكامل</span>
          </button>
        </div>
      </div>

      {viewMode === "clean" ? (
        <AcademyScriptViewer scriptText={scriptText} />
      ) : (
        <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans p-3.5 rounded-xl bg-muted/20 border border-border/40">
          {scriptText || "لا يوجد نص سكريبت تفصيلي متاح لهذا الدرس حالياً."}
        </div>
      )}
    </div>
  );
}
