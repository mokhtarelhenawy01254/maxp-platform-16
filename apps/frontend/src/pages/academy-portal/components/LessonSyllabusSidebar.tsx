import React from "react";
import { Link } from "react-router-dom";
import { Layers, PlayCircle, Lock, BookOpen } from "lucide-react";

export interface SidebarLesson {
  id: string;
  title: string;
  isFreePreview: boolean;
  isUnlocked: boolean;
}

export interface SidebarModule {
  id: string;
  title: string;
  lessons: SidebarLesson[];
}

interface Props {
  courseId: string;
  currentLessonId: string;
  isEnrolled: boolean;
  modules: SidebarModule[];
}

export const LessonSyllabusSidebar: React.FC<Props> = ({
  courseId,
  currentLessonId,
  isEnrolled,
  modules,
}) => {
  return (
    <div className="bg-card rounded-2xl border border-border/70 p-4 sm:p-5 space-y-4 shadow-xs h-fit text-right" dir="rtl">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
          <Layers className="w-3.5 h-3.5" />
        </div>
        <h3 className="font-extrabold text-xs text-foreground tracking-tight">فهرس دروس الكورس</h3>
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto pl-1">
        {modules.map((mod, mIdx) => (
          <div key={mod.id} className="space-y-1.5">
            <span className="text-[11px] font-bold text-muted-foreground block font-mono tabular-nums">
              وحدة {mIdx + 1}: {mod.title}
            </span>

            <div className="space-y-1">
              {mod.lessons.map((l) => {
                const isCurrent = l.id === currentLessonId;
                const canAccess = l.isUnlocked || l.isFreePreview || isEnrolled;

                return (
                  <Link
                    key={l.id}
                    to={canAccess ? `/portal/course/${courseId}/lesson/${l.id}` : "#"}
                    className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-all ${
                      isCurrent
                        ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs"
                        : canAccess
                        ? "hover:bg-muted/40 text-foreground"
                        : "text-muted-foreground/60 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {canAccess ? (
                        <PlayCircle className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                      ) : (
                        <Lock className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                      )}
                      <span className="truncate">{l.title}</span>
                    </div>
                    {l.isFreePreview && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                        معاينة
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
